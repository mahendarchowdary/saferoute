import { Server, Socket } from 'socket.io';
import { prisma } from './lib/prisma';
import { verifyAccessToken } from './middleware/auth';
import { 
  haversineDistance, 
  TripGeofenceManager, 
  getTripGeofence, 
  removeTripGeofence,
  type GeofenceEvent,
  type GPSPoint 
} from './lib/geofence';

interface LocationPayload {
  tripId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery?: number;
  timestamp: number;
}

// Trip geofence managers
const tripGeofences = new Map<string, TripGeofenceManager>();

export const setupWebSocketHandlers = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      console.log('WebSocket auth attempt, token exists:', !!token);
      
      if (!token) {
        console.log('No token provided');
        return next(new Error('Authentication required'));
      }

      // Log token preview for debugging
      console.log('Token preview:', token.substring(0, 20) + '...');

      const decoded = verifyAccessToken(token);
      console.log('Token verification result:', decoded);
      console.log('Token verified, user:', decoded?.id, 'role:', decoded?.role);
      console.log('Token payload:', decoded);
      socket.data.user = decoded;
      next();
    } catch (error: any) {
      console.error('WebSocket auth error:', error.message);
      console.error('Error stack:', error.stack);
      next(new Error('Invalid token: ' + error.message));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    console.log(`Socket connected: ${user.id} (${user.role})`);

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // If admin, join school room and fleet room
    if (user.role === 'ADMIN' && user.schoolId) {
      socket.join(`school:${user.schoolId}`);
      socket.join('fleet:all');
    }

    // If parent, join child's tracking
    if (user.role === 'PARENT') {
      socket.join(`parent:${user.id}`);
    }

    // Admin joins fleet room
    socket.on('join:fleet', () => {
      if (user.role === 'ADMIN') {
        socket.join('fleet:all');
        socket.emit('fleet:joined', { message: 'Joined fleet tracking' });
      }
    });

    // Driver location streaming (also allow ADMIN for simulator testing)
    socket.on('location:stream', async (payload: LocationPayload) => {
      if (user.role !== 'DRIVER' && user.role !== 'ADMIN') return;

      try {
        // Verify trip belongs to driver (optional for testing - log warning if not found)
        const trip = await prisma.trip.findFirst({
          where: {
            id: payload.tripId,
            driverId: user.id,
            status: 'IN_PROGRESS'
          },
          include: {
            route: { include: { stops: true } }
          }
        });

        // Store GPS ping only if trip exists
        if (trip) {
          await prisma.gpsPing.create({
            data: {
              tripId: payload.tripId,
              schoolId: trip.schoolId,
              latitude: payload.lat,
              longitude: payload.lng,
              speed: payload.speed,
              heading: payload.heading,
              accuracy: payload.accuracy,
              battery: payload.battery,
              timestamp: new Date(payload.timestamp)
            }
          });
        }

        // Broadcast to ALL connected clients (for testing/demo)
        const locationUpdate = {
          tripId: payload.tripId,
          driverId: user.id,
          driverName: user.name,
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed,
          heading: payload.heading,
          timestamp: payload.timestamp,
          busPlate: trip?.busId || 'SIM-' + user.id.slice(-4)
        };

        // Broadcast to all connected sockets
        io.emit('fleet:update', locationUpdate);
        io.emit('trip:location', locationUpdate);
        
        console.log('Broadcasting GPS to all clients:', locationUpdate);

        // GEOFENCE: Check if near any stops and alert parents
        if (trip && trip.route.stops.length > 0) {
          const GEOFENCE_RADIUS = 200; // meters
          const ROUTE_DEVIATION_THRESHOLD = 200; // meters off route
          const now = Date.now();
          
        // Initialize trip geofence manager if not exists
        if (!tripGeofences.has(payload.tripId)) {
          const geofence = new TripGeofenceManager(payload.tripId);
          await geofence.initialize();
          tripGeofences.set(payload.tripId, geofence);
        }

        const geofence = tripGeofences.get(payload.tripId)!;
        const location: GPSPoint = {
          lat: payload.lat,
          lng: payload.lng,
          timestamp: new Date(),
        };

        // Process geofence events
        const events = geofence.processLocation(location);
        
        // Handle geofence events
        for (const event of events) {
          switch (event.type) {
            case 'STOP_ARRIVED':
              // Emit to trip room
              io.to(`trip:${payload.tripId}`).emit('stop:arrived', {
                tripId: payload.tripId,
                stopId: event.stopId,
                stopName: event.stopName,
                distance: event.distance,
                timestamp: event.timestamp.toISOString(),
              });
              
              // Notify parents at this stop
              const parents = await prisma.student.findMany({
                where: { stopId: event.stopId },
                select: { parentId: true },
              });
              
              parents.forEach((p: any) => {
                io.to(`user:${p.parentId}`).emit('stop:arrived', {
                  stopId: event.stopId,
                  stopName: event.stopName,
                  timestamp: event.timestamp.toISOString(),
                });
              });
              
              console.log(`✅ Stop arrived: ${event.stopName} (${event.distance}m)`);
              break;

            case 'STOP_APPROACHING':
              // Pre-alert: notify parents bus is approaching
              io.to(`trip:${payload.tripId}`).emit('stop:approaching', {
                tripId: payload.tripId,
                stopId: event.stopId,
                stopName: event.stopName,
                distance: event.distance,
                eta: event.eta,
                timestamp: event.timestamp.toISOString(),
              });
              console.log(`⏰ Approaching: ${event.stopName} (${event.distance}m, ETA ${event.eta}min)`);
              break;

            case 'ROUTE_DEVIATION':
              io.emit('alert:deviation', {
                type: 'ROUTE_DEVIATION',
                message: `Bus is off route (${event.distance}m from nearest stop)`,
                tripId: payload.tripId,
                distance: event.distance,
                timestamp: event.timestamp.toISOString(),
              });
              console.log(`⚠️ Route deviation: ${event.distance}m off route`);
              break;

            case 'ROUTE_DEVIATION_CLEARED':
              io.emit('alert:deviation_cleared', {
                type: 'ROUTE_DEVIATION_CLEARED',
                tripId: payload.tripId,
                timestamp: event.timestamp.toISOString(),
              });
              console.log('✅ Route deviation cleared');
              break;
          }
        }

        // Legacy geofence for mock testing (when no trip in DB)
        if (!trip) {
          const mockStops = [
            { id: 'stop-1', name: 'Maple Street', lat: 17.4080, lng: 78.4785 },
            { id: 'stop-2', name: 'Oak Avenue', lat: 17.4140, lng: 78.4840 },
            { id: 'stop-3', name: 'School', lat: 17.4065, lng: 78.4772 }
          ];
          
          const GEOFENCE_RADIUS = 200;
          const now = Date.now();
          
          for (const stop of mockStops) {
            const distance = haversineDistance(
              { lat: payload.lat, lng: payload.lng },
              { lat: stop.lat, lng: stop.lng }
            );
            
            if (distance <= GEOFENCE_RADIUS) {
              const stopKey = `${payload.tripId}:${stop.id}`;
              const lastNotified = tripGeofences.get(payload.tripId);
              
              // Only notify once every 2 minutes per stop (for testing)
              // Using simple Map for tracking mock notifications
              if (!lastNotified || (Date.now() - now) > 2 * 60 * 1000) {
                const alert = {
                  type: 'GEOFENCE',
                  message: `Bus is approaching ${stop.name} (SIMULATED)`,
                  tripId: payload.tripId,
                  stopId: stop.id,
                  stopName: stop.name,
                  distance: Math.round(distance),
                  timestamp: new Date().toISOString()
                };
                
                io.emit('alert:geofence', alert);
                console.log('MOCK Geofence alert for stop:', stop.name, 'distance:', Math.round(distance), 'm');
              }
            }
          }
        }

      } catch (error) {
        console.error('Location stream error:', error);
      }
    });

    // Driver stop arrival
    socket.on('stop:arrived', async (data: { tripId: string; stopId: string }) => {
      if (user.role !== 'DRIVER') return;

      try {
        const trip = await prisma.trip.findFirst({
          where: {
            id: data.tripId,
            driverId: user.id,
            status: 'IN_PROGRESS'
          },
          include: {
            route: {
              include: {
                stops: { where: { id: data.stopId } }
              }
            }
          }
        });

        if (!trip || trip.route.stops.length === 0) return;

        const stop = trip.route.stops[0];

        // Notify admins
        io.to(`school:${trip.schoolId}`).emit('stop:arrived', {
          tripId: data.tripId,
          stopId: data.stopId,
          stopName: stop.name,
          timestamp: new Date().toISOString()
        });

        // Notify parents at this stop
        const parents = await prisma.student.findMany({
          where: { stopId: data.stopId },
          select: { parentId: true }
        });

        parents.forEach((p: any) => {
          io.to(`user:${p.parentId}`).emit('stop:arrived', {
            stopId: data.stopId,
            stopName: stop.name,
            timestamp: new Date().toISOString()
          });
        });

      } catch (error) {
        console.error('Stop arrival error:', error);
      }
    });

    // Subscribe to specific trip (for parents)
    socket.on('trip:subscribe', async (tripId: string) => {
      if (user.role !== 'PARENT') return;

      try {
        // Verify parent's child is on this trip
        const hasChild = await prisma.attendance.findFirst({
          where: {
            tripId,
            student: { parentId: user.id }
          }
        });

        if (hasChild) {
          socket.join(`trip:${tripId}`);
          socket.emit('trip:subscribed', { tripId });
        }
      } catch (error) {
        console.error('Trip subscribe error:', error);
      }
    });

    // Driver joins their active trip room
    socket.on('trip:join', async (tripId: string) => {
      if (user.role !== 'DRIVER') return;

      try {
        // Verify trip belongs to driver
        const trip = await prisma.trip.findFirst({
          where: {
            id: tripId,
            driverId: user.id,
            status: 'IN_PROGRESS'
          }
        });

        if (trip) {
          socket.join(`trip:${tripId}`);
          socket.emit('trip:joined', { tripId });
          console.log(`Driver ${user.id} joined trip room: ${tripId}`);
        }
      } catch (error) {
        console.error('Trip join error:', error);
      }
    });

    // Parent subscribes to their children's updates
    socket.on('parent:subscribe', async (parentId: string) => {
      if (user.role !== 'PARENT' || user.id !== parentId) return;

      try {
        socket.join(`parent:${parentId}`);
        socket.emit('parent:subscribed', { parentId });
        console.log(`Parent ${parentId} subscribed to updates`);
      } catch (error) {
        console.error('Parent subscribe error:', error);
      }
    });

    // Attendance update
    socket.on('attendance:update', async (data: { tripId: string; studentId: string; status: string }) => {
      if (user.role !== 'DRIVER') return;

      io.to(`trip:${data.tripId}`).emit('attendance:updated', {
        studentId: data.studentId,
        status: data.status,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.id}`);
    });
  });
};
