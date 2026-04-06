import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get parent's children (for parent app)
router.get('/children', requireRole('PARENT'), async (req: any, res, next) => {
  try {
    const children = await prisma.student.findMany({
      where: { parentId: req.user!.id },
      include: {
        route: { select: { id: true, name: true } },
        stop: { select: { id: true, name: true, latitude: true, longitude: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(children);
  } catch (error) {
    next(error);
  }
});

// Get active trip for a specific student (for parent tracking)
router.get('/student-trip/:studentId', requireRole('PARENT'), async (req: any, res, next) => {
  try {
    // Verify the student belongs to this parent
    const student = await prisma.student.findFirst({
      where: {
        id: req.params.studentId,
        parentId: req.user!.id
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find active trip for this student's route
    const activeTrip = await prisma.trip.findFirst({
      where: {
        routeId: student.routeId,
        status: 'IN_PROGRESS'
      },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, plateNumber: true } },
        route: {
          include: {
            stops: { orderBy: { sequence: 'asc' } }
          }
        },
        attendance: {
          where: { studentId: req.params.studentId },
          include: {
            student: { select: { id: true, name: true, status: true } }
          }
        },
        gpsPings: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!activeTrip) {
      return res.status(404).json({ error: 'No active trip for this student' });
    }

    res.json(activeTrip);
  } catch (error) {
    next(error);
  }
});

export { router as parentRouter };
