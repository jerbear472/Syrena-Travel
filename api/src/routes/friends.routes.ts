import { Router } from 'express';
import { verifyToken } from '../middleware/auth';

export const friendsRouter = Router();

// All friends routes require authentication
friendsRouter.use(verifyToken);

// Placeholder routes - to be implemented
friendsRouter.get('/', (req, res) => {
  res.json({ message: 'Get friends list' });
});

friendsRouter.post('/request', (req, res) => {
  res.json({ message: 'Send friend request' });
});

friendsRouter.put('/request/:id', (req, res) => {
  res.json({ message: 'Accept/reject friend request' });
});

friendsRouter.delete('/:id', (req, res) => {
  res.json({ message: 'Remove friend' });
});