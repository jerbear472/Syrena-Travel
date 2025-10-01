import { Router } from 'express';
import { verifyToken } from '../middleware/auth';

export const placesRouter = Router();

// All places routes require authentication
placesRouter.use(verifyToken);

// Placeholder routes - to be implemented
placesRouter.get('/', (req, res) => {
  res.json({ message: 'Get user places' });
});

placesRouter.post('/', (req, res) => {
  res.json({ message: 'Save new place' });
});

placesRouter.get('/nearby', (req, res) => {
  res.json({ message: 'Get nearby places from friends' });
});

placesRouter.delete('/:id', (req, res) => {
  res.json({ message: 'Delete place' });
});