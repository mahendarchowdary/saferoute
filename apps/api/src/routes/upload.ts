import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, GIF, PDF, XLSX'));
    }
  },
});

router.use(authMiddleware);

// Upload single file
router.post('/', requireRole('ADMIN'), upload.single('file'), async (req: any, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type, entityId } = req.body;
    const schoolId = req.user!.schoolId;

    // Save file record to database
    const fileRecord = await prisma.fileUpload.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        schoolId,
        uploadedBy: req.user!.id,
        type: type || 'GENERAL',
        entityId: entityId || null,
      },
    });

    res.json({
      id: fileRecord.id,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
});

// Upload student photo
router.post('/student-photo', requireRole('ADMIN'), upload.single('photo'), async (req: any, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID required' });
    }

    // Verify student belongs to admin's school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.user!.schoolId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update student photo URL
    const photoUrl = `/uploads/${req.file.filename}`;
    await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl },
    });

    // Create file record
    await prisma.fileUpload.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        schoolId: req.user!.schoolId,
        uploadedBy: req.user!.id,
        type: 'STUDENT_PHOTO',
        entityId: studentId,
      },
    });

    res.json({ photoUrl });
  } catch (error) {
    next(error);
  }
});

// Get upload by ID
router.get('/:id', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const upload = await prisma.fileUpload.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.user!.schoolId,
      },
    });

    if (!upload) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(upload);
  } catch (error) {
    next(error);
  }
});

// Delete upload
router.delete('/:id', requireRole('ADMIN'), async (req: any, res, next) => {
  try {
    const upload = await prisma.fileUpload.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.user!.schoolId,
      },
    });

    if (!upload) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from database
    await prisma.fileUpload.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as uploadRouter };
