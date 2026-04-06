import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { otpStore } from '../lib/redis';
import { generateTokens, verifyRefreshToken, authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  schoolName: z.string().min(2),
  schoolAddress: z.string().min(5),
  latitude: z.number(),
  longitude: z.number()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// School Admin Registration
router.post('/register-school', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: data.schoolName,
          address: data.schoolAddress,
          latitude: data.latitude,
          longitude: data.longitude,
          email: data.email,
          phone: data.phone
        }
      });

      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: hashedPassword,
          role: 'ADMIN',
          schoolId: school.id
        }
      });

      return { school, user };
    });

    const tokens = generateTokens({
      id: result.user.id,
      email: (result.user.email as string) || '',
      role: result.user.role,
      schoolId: result.user.schoolId || undefined
    });

    res.status(201).json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        school: result.school
      },
      ...tokens
    });
  } catch (error: any) {
    console.error('[REGISTER-SCHOOL] Error:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    // Return detailed error for debugging
    res.status(500).json({ 
      error: 'Database error', 
      details: error.message,
      code: error.code 
    });
  }
});

// Login (All roles)
router.post('/login', async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    
    console.log(`[LOGIN] Attempt: email=${email}, phone=${phone}`);
    
    if (!password || (!email && !phone)) {
      console.log('[LOGIN] Failed: Missing credentials');
      return res.status(400).json({ error: 'Please provide email/phone and password' });
    }

    // Find user by email or phone
    let user;
    try {
      if (email) {
        console.log(`[LOGIN] Looking up by email: ${email}`);
        user = await prisma.user.findUnique({
          where: { email },
          include: { school: true }
        });
      } else if (phone) {
        console.log(`[LOGIN] Looking up by phone: ${phone}`);
        user = await prisma.user.findFirst({
          where: { phone },
          include: { school: true }
        });
      }
    } catch (dbError) {
      console.error('[LOGIN] Database error:', dbError);
      return res.status(500).json({ error: 'Database connection failed' });
    }

    if (!user) {
      console.log('[LOGIN] Failed: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[LOGIN] User found: ${user.email}, role: ${user.role}`);

    // Check password
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error('[LOGIN] Password compare error:', bcryptError);
      return res.status(500).json({ error: 'Password verification failed' });
    }

    if (!passwordValid) {
      console.log('[LOGIN] Failed: Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[LOGIN] Password valid, generating tokens...');

    const tokens = generateTokens({
      id: user.id,
      email: (user.email as string) || '',
      role: user.role,
      schoolId: user.schoolId || undefined
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    console.log('[LOGIN] Success!');

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school
      },
      ...tokens
    });
  } catch (error) {
    console.error('[LOGIN] Unexpected error:', error);
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const tokens = generateTokens({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId
    });

    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Send OTP (T1.5)
router.post('/otp/send', async (req, res, next) => {
  try {
    const schema = z.object({ phone: z.string().min(10) });
    const { phone } = schema.parse(req.body);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await otpStore.set(phone, otp);

    // In production, send SMS here
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      message: 'OTP sent successfully',
      // Only in dev
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    next(error);
  }
});

// Verify OTP (T1.5)
router.post('/otp/verify', async (req, res, next) => {
  try {
    const schema = z.object({
      phone: z.string().min(10),
      code: z.string().length(6)
    });
    const { phone, code } = schema.parse(req.body);

    const storedCode = await otpStore.get(phone);
    if (!storedCode || storedCode !== code) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP after verification
    await otpStore.delete(phone);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tokens = generateTokens({
      id: user.id,
      email: (user.email as string) || '',
      role: user.role,
      schoolId: user.schoolId || undefined
    });

    res.json({
      message: 'OTP verified',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { school: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Register FCM token
router.post('/fcm-token', authMiddleware, async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { token, device } = req.body;

    await prisma.fcmToken.upsert({
      where: { token },
      update: { userId: req.user!.id, device },
      create: { userId: req.user!.id, token, device }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Forgot password - Request reset (T1.8)
router.post('/forgot-password', async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If email exists, reset link sent' });
    }

    // Generate reset token (valid 1 hour)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires: resetExpires
      }
    });

    // In production, send email here
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ 
      message: 'If email exists, reset instructions sent',
      // Only in dev - remove in production
      devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    next(error);
  }
});

// Reset password with token (T1.8)
router.post('/reset-password', async (req, res, next) => {
  try {
    const schema = z.object({
      token: z.string(),
      newPassword: z.string().min(6)
    });
    const { token, newPassword } = schema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
