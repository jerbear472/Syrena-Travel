import jwt from 'jsonwebtoken';

// No hardcoded fallback: a publicly-known secret would let anyone forge tokens
// for any user. Fail loudly if JWT_SECRET is unset rather than signing with a
// guessable default.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set — refusing to sign/verify tokens with a default.');
  }
  return secret;
}

export const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, getSecret(), { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: number } | null => {
  try {
    return jwt.verify(token, getSecret()) as { userId: number };
  } catch (error) {
    return null;
  }
};