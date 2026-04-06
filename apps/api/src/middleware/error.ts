import { Response } from 'express';
import { AuthRequest } from './auth';

export const errorHandler = (
  err: Error,
  req: AuthRequest,
  res: Response,
  next: any
) => {
  console.error('Error:', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: err.message 
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({ 
      error: 'Database error', 
      message: err.message 
    });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};
