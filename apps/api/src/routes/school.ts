import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// Get school details
router.get('/:id', async (req: any, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { buses: true, routes: true, students: true, users: true }
        }
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    next(error);
  }
});

// Update school
router.patch('/:id', async (req: any, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      address: z.string().min(5).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      logoUrl: z.string().optional()
    });

    const data = schema.parse(req.body);

    const school = await prisma.school.update({
      where: { id: req.params.id },
      data
    });

    res.json(school);
  } catch (error) {
    next(error);
  }
});

export { router as schoolRouter };
