import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get all buses for school
router.get('/', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const buses = await prisma.bus.findMany({
      where: { schoolId: req.user!.schoolId },
      include: {
        _count: { select: { trips: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(buses);
  } catch (error) {
    next(error);
  }
});

// Create bus
router.post('/', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      plateNumber: z.string().min(3),
      model: z.string().optional(),
      capacity: z.number().int().min(1).default(30),
      status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).default('ACTIVE')
    });

    const data = schema.parse(req.body);

    const bus = await prisma.bus.create({
      data: {
        ...data,
        schoolId: req.user!.schoolId!
      }
    });

    res.status(201).json(bus);
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('plateNumber')) {
      return res.status(409).json({ error: 'Plate number already exists' });
    }
    next(error);
  }
});

// Update bus
router.patch('/:id', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      plateNumber: z.string().min(3).optional(),
      model: z.string().optional(),
      capacity: z.number().int().min(1).optional(),
      status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional()
    });

    const data = schema.parse(req.body);

    const bus = await prisma.bus.update({
      where: { id: req.params.id, schoolId: req.user!.schoolId },
      data
    });

    res.json(bus);
  } catch (error) {
    next(error);
  }
});

// Delete bus
router.delete('/:id', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    await prisma.bus.delete({
      where: { id: req.params.id, schoolId: req.user!.schoolId }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as busRouter };
