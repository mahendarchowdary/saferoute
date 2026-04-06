import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// Dashboard stats
router.get('/stats', async (req: any, res, next) => {
  try {
    const schoolId = req.user!.schoolId;

    const [
      totalBuses,
      activeBuses,
      totalStudents,
      totalRoutes,
      activeTrips,
      todayTrips,
      pendingAlerts
    ] = await Promise.all([
      prisma.bus.count({ where: { schoolId } }),
      prisma.bus.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.route.count({ where: { schoolId } }),
      prisma.trip.count({ where: { schoolId, status: 'IN_PROGRESS' } }),
      prisma.trip.count({
        where: {
          schoolId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.alert.count({
        where: { schoolId, resolvedAt: null }
      })
    ]);

    // Get recent trips
    const recentTrips = await prisma.trip.findMany({
      where: { schoolId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        driver: { select: { name: true } },
        bus: { select: { plateNumber: true } },
        route: { select: { name: true } }
      }
    });

    res.json({
      stats: {
        totalBuses,
        activeBuses,
        totalStudents,
        totalRoutes,
        activeTrips,
        todayTrips,
        pendingAlerts
      },
      recentTrips
    });
  } catch (error) {
    next(error);
  }
});

export { router as dashboardRouter };
