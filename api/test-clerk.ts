import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    return res.status(200).json({
      message: 'Token verified',
      userId: payload.sub,
      email: payload.email,
    });
  } catch (error) {
    return res.status(401).json({
      error: 'Token verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}