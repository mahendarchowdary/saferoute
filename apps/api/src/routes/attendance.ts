import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get attendance for a trip (Driver)
router.get('/trip/:tripId', requireRole('DRIVER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.tripId,
        ...(req.user!.role === 'DRIVER' && { driverId: req.user!.id })
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const attendance = await prisma.attendance.findMany({
      where: { tripId: req.params.tripId },
      include: {
        student: {
          include: { stop: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

// Mark student onboard (Driver)
router.post('/onboard', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const schema = z.object({
      tripId: z.string(),
      studentId: z.string()
    });

    const data = schema.parse(req.body);

    // Verify trip belongs to driver
    const trip = await prisma.trip.findFirst({
      where: {
        id: data.tripId,
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Active trip not found' });
    }

    const attendance = await prisma.attendance.update({
      where: {
        tripId_studentId: {
          tripId: data.tripId,
          studentId: data.studentId
        }
      },
      data: {
        status: 'ONBOARD',
        onboardedAt: new Date()
      },
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

// Mark student dropped (Driver)
router.post('/drop', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const schema = z.object({
      tripId: z.string(),
      studentId: z.string()
    });

    const data = schema.parse(req.body);

    const trip = await prisma.trip.findFirst({
      where: {
        id: data.tripId,
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Active trip not found' });
    }

    const attendance = await prisma.attendance.update({
      where: {
        tripId_studentId: {
          tripId: data.tripId,
          studentId: data.studentId
        }
      },
      data: {
        status: 'DROPPED',
        droppedAt: new Date()
      },
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

// Mark student absent (Driver)
router.post('/absent', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const schema = z.object({
      tripId: z.string(),
      studentId: z.string()
    });

    const data = schema.parse(req.body);

    const trip = await prisma.trip.findFirst({
      where: {
        id: data.tripId,
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Active trip not found' });
    }

    const attendance = await prisma.attendance.update({
      where: {
        tripId_studentId: {
          tripId: data.tripId,
          studentId: data.studentId
        }
      },
      data: { status: 'ABSENT' },
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

// Drop all students at school (bulk action)
router.post('/drop-all', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const schema = z.object({ tripId: z.string() });
    const { tripId } = schema.parse(req.body);

    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId: req.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Active trip not found' });
    }

    const result = await prisma.attendance.updateMany({
      where: {
        tripId,
        status: 'ONBOARD'
      },
      data: {
        status: 'DROPPED',
        droppedAt: new Date()
      }
    });

    res.json({ dropped: result.count });
  } catch (error) {
    next(error);
  }
});

export { router as attendanceRouter };
