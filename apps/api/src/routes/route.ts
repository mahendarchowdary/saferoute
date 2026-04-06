import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get all routes
router.get('/', requireRole('ADMIN', 'DRIVER'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const routes = await prisma.route.findMany({
      where: { schoolId: req.user!.schoolId },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        _count: { select: { students: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(routes);
  } catch (error) {
    next(error);
  }
});

// Create route with stops
router.post('/', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const stopSchema = z.object({
      name: z.string().min(2),
      latitude: z.number(),
      longitude: z.number(),
      arrivalMin: z.number().optional()
    });

    const schema = z.object({
      name: z.string().min(2),
      distanceKm: z.number().optional(),
      estimatedMin: z.number().optional(),
      stops: z.array(stopSchema).min(1)
    });

    const data = schema.parse(req.body);

    const route = await prisma.route.create({
      data: {
        name: data.name,
        distanceKm: data.distanceKm,
        estimatedMin: data.estimatedMin,
        schoolId: req.user!.schoolId!,
        stops: {
          create: data.stops.map((stop, index) => ({
            name: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            sequence: index + 1,
            arrivalMin: stop.arrivalMin
          }))
        }
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } }
      }
    });

    res.status(201).json(route);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Route name already exists' });
    }
    next(error);
  }
});

// Update route
router.patch('/:id', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      distanceKm: z.number().optional(),
      estimatedMin: z.number().optional()
    });

    const data = schema.parse(req.body);

    const route = await prisma.route.update({
      where: { id: req.params.id, schoolId: req.user!.schoolId },
      data,
      include: { stops: { orderBy: { sequence: 'asc' } } }
    });

    res.json(route);
  } catch (error) {
    next(error);
  }
});

// Add stop to route
router.post('/:id/stops', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      latitude: z.number(),
      longitude: z.number(),
      sequence: z.number().int().min(1),
      arrivalMin: z.number().optional()
    });

    const data = schema.parse(req.body);

    const stop = await prisma.stop.create({
      data: {
        ...data,
        routeId: req.params.id
      }
    });

    res.status(201).json(stop);
  } catch (error) {
    next(error);
  }
});

export { router as routeRouter };
