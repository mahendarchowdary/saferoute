import { Server, Socket } from 'socket.io';
import { prisma } from './lib/prisma';
import { verifyAccessToken } from './middleware/auth';

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

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Store notified stops to prevent duplicate alerts (stopId:timestamp)
const notifiedStops = new Map<string, number>();

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
          
          // Check for off-route deviation
          let minDistanceToRoute = Infinity;
          for (const stop of trip.route.stops) {
            const dist = calculateDistance(payload.lat, payload.lng, stop.latitude, stop.longitude);
            if (dist < minDistanceToRoute) {
              minDistanceToRoute = dist;
            }
          }
          
          // Alert if off-route
          if (minDistanceToRoute > ROUTE_DEVIATION_THRESHOLD) {
            const deviationKey = `${payload.tripId}:deviation`;
            const lastDeviationAlert = notifiedStops.get(deviationKey);
            
            // Alert once every 2 minutes
            if (!lastDeviationAlert || (now - lastDeviationAlert) > 2 * 60 * 1000) {
              notifiedStops.set(deviationKey, now);
              
              const alert = {
                type: 'ROUTE_DEVIATION',
                message: `Bus is off route (${Math.round(minDistanceToRoute)}m from nearest stop)`,
                tripId: payload.tripId,
                distance: Math.round(minDistanceToRoute),
                timestamp: new Date().toISOString()
              };
              
              io.emit('alert:deviation', alert);
              console.log('Route deviation alert:', Math.round(minDistanceToRoute), 'm off route');
            }
          }
          
          for (const stop of trip.route.stops) {
            const distance = calculateDistance(
              payload.lat, payload.lng,
              stop.latitude, stop.longitude
            );
            
            if (distance <= GEOFENCE_RADIUS) {
              const stopKey = `${payload.tripId}:${stop.id}`;
              const lastNotified = notifiedStops.get(stopKey);
              
              // Only notify once every 5 minutes per stop
              if (!lastNotified || (now - lastNotified) > 5 * 60 * 1000) {
                notifiedStops.set(stopKey, now);
                
                const alert = {
                  type: 'GEOFENCE',
                  message: `Bus is approaching ${stop.name}`,
                  tripId: payload.tripId,
                  stopId: stop.id,
                  stopName: stop.name,
                  distance: Math.round(distance),
                  timestamp: new Date().toISOString()
                };
                
                // Notify all parents (in real app, filter by parents at this stop)
                io.emit('alert:geofence', alert);
                console.log('Geofence alert sent for stop:', stop.name, 'distance:', Math.round(distance), 'm');
              }
            }
          }
        } else if (!trip) {
          // MOCK GEOFENCE for simulator testing - use hardcoded stops
          const mockStops = [
            { id: 'stop-1', name: 'Maple Street', lat: 17.4080, lng: 78.4785 },
            { id: 'stop-2', name: 'Oak Avenue', lat: 17.4140, lng: 78.4840 },
            { id: 'stop-3', name: 'School', lat: 17.4065, lng: 78.4772 }
          ];
          
          const GEOFENCE_RADIUS = 200; // meters
          const now = Date.now();
          
          for (const stop of mockStops) {
            const distance = calculateDistance(
              payload.lat, payload.lng,
              stop.lat, stop.lng
            );
            
            if (distance <= GEOFENCE_RADIUS) {
              const stopKey = `${payload.tripId}:${stop.id}`;
              const lastNotified = notifiedStops.get(stopKey);
              
              // Only notify once every 2 minutes per stop (for testing)
              if (!lastNotified || (now - lastNotified) > 2 * 60 * 1000) {
                notifiedStops.set(stopKey, now);
                
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
