import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from './lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticateRequest(req);
    return res.status(200).json({
      message: 'Auth test works!',
      user
    });
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}