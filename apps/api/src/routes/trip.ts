import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get driver attendance stats (T4.4)
router.get('/driver-attendance/:date', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const { date } = req.params;
    const schoolId = req.user!.schoolId;
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all trips for the date with driver info
    const trips = await prisma.trip.findMany({
      where: {
        schoolId,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        driver: { select: { id: true, name: true } },
        attendance: true
      }
    });
    
    // Group by driver
    const driverMap = new Map();
    
    for (const trip of trips) {
      if (!trip.driver) continue;
      
      const driverId = trip.driver.id;
      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          driverId,
          driverName: trip.driver.name,
          tripsCompleted: 0,
          tripsInProgress: 0,
          totalStudents: 0,
          studentsOnboard: 0,
          studentsDropped: 0,
          attendanceRate: 0
        });
      }
      
      const stats = driverMap.get(driverId);
      
      if (trip.status === 'COMPLETED') {
        stats.tripsCompleted++;
      } else if (trip.status === 'IN_PROGRESS') {
        stats.tripsInProgress++;
      }
      
      for (const att of trip.attendance) {
        stats.totalStudents++;
        if (att.status === 'ONBOARD') stats.studentsOnboard++;
        if (att.status === 'DROPPED') stats.studentsDropped++;
      }
    }
    
    // Calculate attendance rate
    const result = Array.from(driverMap.values()).map(stats => ({
      ...stats,
      attendanceRate: stats.totalStudents > 0
        ? Math.round(((stats.studentsOnboard + stats.studentsDropped) / stats.totalStudents) * 100)
        : 0
    }));
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get all trips
router.get('/', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { schoolId: req.user!.schoolId },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, plateNumber: true } },
        route: { select: { id: true, name: true } },
        _count: { select: { attendance: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(trips);
  } catch (error) {
    next(error);
  }
});

// Get active trips (for fleet map)
router.get('/active', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { 
        schoolId: req.user!.schoolId,
        status: 'IN_PROGRESS'
      },
      include: {
        driver: { select: { id: true, name: true } },
        bus: { select: { id: true, plateNumber: true } },
        route: { 
          include: { stops: { orderBy: { sequence: 'asc' } } }
        },
        attendance: {
          include: {
            student: { select: { id: true, name: true, stopId: true } }
          }
        }
      }
    });

    res.json(trips);
  } catch (error) {
    next(error);
  }
});

// Start trip (Driver)
router.post('/start', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const schema = z.object({
      busId: z.string(),
      routeId: z.string(),
      shift: z.enum(['MORNING', 'AFTERNOON'])
    });

    const data = schema.parse(req.body);

    // Check if driver already has an active trip
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (activeTrip) {
      return res.status(400).json({ error: 'You already have an active trip' });
    }

    const trip = await prisma.trip.create({
      data: {
        driverId: req.user!.id,
        busId: data.busId,
        routeId: data.routeId,
        shift: data.shift,
        schoolId: req.user!.schoolId!,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      },
      include: {
        bus: { select: { id: true, plateNumber: true } },
        route: { 
          include: { stops: { orderBy: { sequence: 'asc' } } }
        }
      }
    });

    // Initialize attendance records for all students on this route
    const students = await prisma.student.findMany({
      where: { routeId: data.routeId }
    });

    await prisma.attendance.createMany({
      data: students.map((student: any) => ({
        tripId: trip.id,
        studentId: student.id,
        status: 'PENDING'
      })),
      skipDuplicates: true
    });

    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
});

// End trip (Driver)
router.post('/:id/end', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      },
      include: {
        attendance: {
          where: { status: 'ONBOARD' },
          select: { id: true }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or already ended' });
    }

    if (trip.attendance.length > 0) {
      return res.status(400).json({ 
        error: 'Students still onboard',
        count: trip.attendance.length
      });
    }

    const endedTrip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      },
      include: {
        bus: { select: { id: true, plateNumber: true } },
        route: { select: { id: true, name: true } },
        _count: { select: { attendance: true, gpsPings: true } }
      }
    });

    res.json(endedTrip);
  } catch (error) {
    next(error);
  }
});

// Get trip detail
router.get('/:id', requireRole('ADMIN', 'DRIVER'), async (req: any, res, next) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: { 
        id: req.params.id,
        ...(req.user!.role === 'DRIVER' && { driverId: req.user!.id })
      },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, plateNumber: true } },
        route: { 
          include: { stops: { orderBy: { sequence: 'asc' } } }
        },
        attendance: {
          include: {
            student: { 
              select: { id: true, name: true, grade: true, photoUrl: true },
              include: { stop: true }
            }
          }
        },
        gpsPings: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(trip);
  } catch (error) {
    next(error);
  }
});

// Batch location update from driver app
router.post('/:id/location/batch', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const pointSchema = z.object({
      lat: z.number(),
      lng: z.number(),
      speed: z.number().optional(),
      heading: z.number().optional(),
      accuracy: z.number().optional(),
      battery: z.number().optional(),
      timestamp: z.number()
    });

    const schema = z.object({
      points: z.array(pointSchema).min(1)
    });

    const data = schema.parse(req.body);

    // Verify trip belongs to driver
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Active trip not found' });
    }

    // Store GPS pings
    await prisma.gpsPing.createMany({
      data: data.points.map(p => ({
        tripId: req.params.id,
        latitude: p.lat,
        longitude: p.lng,
        speed: p.speed,
        heading: p.heading,
        accuracy: p.accuracy,
        battery: p.battery,
        timestamp: new Date(p.timestamp)
      })),
      skipDuplicates: true
    });

    res.json({ stored: data.points.length });
  } catch (error) {
    next(error);
  }
});

// Mark attendance (Driver marks student picked up or dropped)
router.post('/:id/attendance/:studentId', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['PENDING', 'ONBOARD', 'DROPPED', 'ABSENT'])
    });

    const { status } = schema.parse(req.body);

    // Verify trip belongs to driver and is in progress
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Active trip not found' });
    }

    // Update attendance record
    const attendance = await prisma.attendance.updateMany({
      where: {
        tripId: req.params.id,
        studentId: req.params.studentId
      },
      data: status === 'ONBOARD' ? { status, onboardedAt: new Date() } : { status, droppedAt: new Date() }
    });

    if (attendance.count === 0) {
      return res.status(404).json({ error: 'Student not found in this trip' });
    }

    // Get updated record for WebSocket broadcast
    const updatedAttendance = await prisma.attendance.findFirst({
      where: {
        tripId: req.params.id,
        studentId: req.params.studentId
      },
      include: {
        student: { select: { id: true, name: true, stopId: true } }
      }
    });

    res.json({
      message: `Student marked as ${status}`,
      attendance: updatedAttendance
    });
  } catch (error) {
    next(error);
  }
});

// Get trip detail with GPS log (for admin monitoring)
router.get('/:id/detail', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.user!.schoolId
      },
      include: {
        bus: { select: { id: true, plateNumber: true, model: true } },
        driver: { select: { id: true, name: true, phone: true } },
        route: {
          include: {
            stops: { orderBy: { sequence: 'asc' } }
          }
        },
        attendance: {
          include: {
            student: {
              select: { id: true, name: true, grade: true, photoUrl: true },
              include: { stop: true }
            }
          }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Get GPS log for this trip (last 24 hours)
    const gpsLog = await prisma.gpsPing.findMany({
      where: {
        tripId: req.params.id,
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { timestamp: 'asc' },
      take: 1000
    });

    res.json({ trip, gpsLog });
  } catch (error) {
    next(error);
  }
});

// Get my active trip (for driver app)
router.get('/my/active', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: {
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      },
      include: {
        bus: { select: { id: true, plateNumber: true } },
        route: {
          include: { stops: { orderBy: { sequence: 'asc' } } }
        },
        attendance: {
          include: {
            student: {
              select: { id: true, name: true, grade: true, photoUrl: true },
              include: { stop: true }
            }
          }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'No active trip' });
    }

    res.json(trip);
  } catch (error) {
    next(error);
  }
});

export { router as tripRouter };
