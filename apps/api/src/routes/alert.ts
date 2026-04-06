import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get all alerts for school
router.get('/', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { schoolId: req.user!.schoolId },
      include: {
        trip: {
          include: {
            driver: { select: { id: true, name: true } },
            bus: { select: { id: true, plateNumber: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

// Create SOS alert (Driver)
router.post('/sos', requireRole('DRIVER'), async (req: any, res, next) => {
  try {
    const schema = z.object({
      tripId: z.string(),
      message: z.string().min(1)
    });

    const data = schema.parse(req.body);

    // Verify trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: data.tripId,
        driverId: req.user!.id
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const alert = await prisma.alert.create({
      data: {
        schoolId: trip.schoolId,
        tripId: data.tripId,
        type: 'SOS',
        severity: 'CRITICAL',
        message: data.message
      }
    });

    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
});

// Resolve alert (Admin)
router.patch('/:id/resolve', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id, schoolId: req.user!.schoolId },
      data: { resolvedAt: new Date() }
    });

    res.json(alert);
  } catch (error) {
    next(error);
  }
});

export { router as alertRouter };
