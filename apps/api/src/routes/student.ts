import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();

router.use(authMiddleware);

// Get all students
router.get('/', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const students = await prisma.student.findMany({
      where: { schoolId: req.user!.schoolId },
      include: {
        parent: { select: { id: true, name: true, phone: true, email: true } },
        route: { select: { id: true, name: true } },
        stop: { select: { id: true, name: true, sequence: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(students);
  } catch (error) {
    next(error);
  }
});

// Create student
router.post('/', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      rollNumber: z.string().optional(),
      grade: z.string().optional(),
      parentName: z.string().min(2),
      parentEmail: z.string().email(),
      parentPhone: z.string().min(10),
      routeId: z.string().optional(),
      stopId: z.string().optional(),
      photoUrl: z.string().optional()
    });

    const data = schema.parse(req.body);

    const result = await prisma.$transaction(async (tx: any) => {
      // Find parent by phone (phone is unique, email is optional)
      let parent = await tx.user.findUnique({
        where: { phone: data.parentPhone }
      });

      if (!parent) {
        // Check if email exists before creating
        const existingByEmail = data.parentEmail ? await tx.user.findUnique({
          where: { email: data.parentEmail }
        }) : null;
        
        if (existingByEmail) {
          throw new Error('EMAIL_EXISTS');
        }
        
        parent = await tx.user.create({
          data: {
            name: data.parentName,
            email: data.parentEmail || null,
            phone: data.parentPhone,
            password: await bcrypt.hash('parent123', 10),
            role: 'PARENT',
            schoolId: req.user!.schoolId!
          }
        });
      }

      const student = await tx.student.create({
        data: {
          name: data.name,
          rollNumber: data.rollNumber,
          grade: data.grade,
          schoolId: req.user!.schoolId!,
          parentId: parent.id,
          routeId: data.routeId,
          stopId: data.stopId,
          photoUrl: data.photoUrl
        },
        include: {
          parent: { select: { id: true, name: true, phone: true, email: true } },
          route: { select: { id: true, name: true } },
          stop: { select: { id: true, name: true } }
        }
      });

      return student;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return res.status(409).json({ error: `${field} already exists` });
    }
    next(error);
  }
});

// Bulk import students
router.post('/bulk-import', requireRole('ADMIN'), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const schema = z.array(z.object({
      name: z.string().min(2),
      rollNumber: z.string().optional(),
      grade: z.string().optional(),
      parentName: z.string().min(2),
      parentEmail: z.string().email(),
      parentPhone: z.string().min(10),
      routeId: z.string().optional(),
      stopId: z.string().optional()
    }));

    const students = schema.parse(req.body);
    const results = [];

    for (const data of students) {
      try {
        const result = await prisma.$transaction(async (tx: any) => {
          let parent = await tx.user.findUnique({
            where: { email: data.parentEmail }
          });

          if (!parent) {
            parent = await tx.user.create({
              data: {
                name: data.parentName,
                email: data.parentEmail,
                phone: data.parentPhone,
                password: await bcrypt.hash('parent123', 10),
                role: 'PARENT',
                schoolId: req.user!.schoolId!
              }
            });
          }

          const student = await tx.student.create({
            data: {
              name: data.name,
              rollNumber: data.rollNumber,
              grade: data.grade,
              schoolId: req.user!.schoolId!,
              parentId: parent.id,
              routeId: data.routeId,
              stopId: data.stopId
            }
          });

          return student;
        });

        results.push({ success: true, student: result });
      } catch (err) {
        results.push({ success: false, error: (err as Error).message, data });
      }
    }

    res.json({ imported: results.length, results });
  } catch (error) {
    next(error);
  }
});

export { router as studentRouter };
