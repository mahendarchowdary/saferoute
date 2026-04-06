import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get all drivers
router.get('/', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const drivers = await prisma.user.findMany({
      where: { 
        schoolId: req.user!.schoolId,
        role: 'DRIVER'
      },
      select: { 
        id: true, name: true, email: true, phone: true, 
        role: true, schoolId: true, createdAt: true, updatedAt: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(drivers);
  } catch (error) {
    next(error);
  }
});

// Create driver
router.post('/', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().min(10),
      password: z.string().min(6)
    });

    const data = schema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const driver = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        password: hashedPassword,
        role: 'DRIVER',
        schoolId: req.user!.schoolId!
      },
      select: { 
        id: true, name: true, email: true, phone: true, 
        role: true, schoolId: true, createdAt: true, updatedAt: true 
      }
    });

    res.status(201).json(driver);
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
      return res.status(409).json({ error: 'Phone number already exists' });
    }
    next(error);
  }
});

// Get driver's available buses and routes (for driver app)
router.get('/available-resources', requireRole('DRIVER'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const [buses, routes] = await Promise.all([
      prisma.bus.findMany({
        where: { schoolId: req.user!.schoolId, status: 'ACTIVE' },
        select: { id: true, plateNumber: true, model: true }
      }),
      prisma.route.findMany({
        where: { schoolId: req.user!.schoolId },
        include: {
          stops: { orderBy: { sequence: 'asc' } }
        }
      })
    ]);

    res.json({ buses, routes });
  } catch (error) {
    next(error);
  }
});

// Get driver's trip history
router.get('/trips/history', requireRole('DRIVER'), async (req: Request & { user?: any }, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { driverId: req.user!.id },
      include: {
        bus: { select: { plateNumber: true } },
        route: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ trips });
  } catch (error) {
    next(error);
  }
});

// Get driver stats for dashboard
router.get('/stats', requireRole('DRIVER'), async (req: Request & { user?: any }, res, next) => {
  try {
    const [totalTrips, activeTrip, todayTrips] = await Promise.all([
      prisma.trip.count({ where: { driverId: req.user!.id } }),
      prisma.trip.findFirst({
        where: { driverId: req.user!.id, status: 'IN_PROGRESS' },
        include: { bus: true, route: { include: { stops: true } } }
      }),
      prisma.trip.count({
        where: {
          driverId: req.user!.id,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ]);
    res.json({ totalTrips, activeTrip, todayTrips });
  } catch (error) {
    next(error);
  }
});

export { router as driverRouter };
