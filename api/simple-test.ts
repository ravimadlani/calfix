import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    message: 'TypeScript test works!',
    method: req.method,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing'
    }
  });
}