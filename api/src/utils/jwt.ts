import jwt from 'jsonwebtoken';

export const generateToken = (userId: number): string => {
  const secret = process.env.JWT_SECRET || 'default-secret-key';
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: number } | null => {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    return jwt.verify(token, secret) as { userId: number };
  } catch (error) {
    return null;
  }
};