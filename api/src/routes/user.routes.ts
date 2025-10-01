import { Router } from 'express';
import { verifyToken } from '../middleware/auth';

export const userRouter = Router();

// Placeholder routes - to be implemented
userRouter.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'User profile endpoint' });
});

userRouter.put('/profile', verifyToken, (req, res) => {
  res.json({ message: 'Update profile endpoint' });
});