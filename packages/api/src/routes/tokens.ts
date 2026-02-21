import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tokens
router.get('/', async (req: Request, res: Response) => {
  const page   = parseInt(req.query.page as string) || 1;
  const limit  = parseInt(req.query.limit as string) || 20;
  const sort   = (req.query.sort as string) || 'new';
  const search = (req.query.search as string) || '';

  const orderBy: any = {
    new:     { deployedAt: 'desc' },
    mcap:    { marketCap: 'desc' },
    volume:  { tradeVolume: 'desc' },
    gain:    { priceChange24h: 'desc' },
    holders: { holders: 'desc' },
  }[sort] || { deployedAt: 'desc' };

  const where = search
    ? {
        OR: [
          { name:   { contains: search, mode: 'insensitive' as const } },
          { symbol: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [tokens, total] = await Promise.all([
    prisma.token.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.token.count({ where }),
  ]);

  res.json({ tokens, total, page, limit });
});

// GET /api/tokens/:address
router.get('/:address', async (req: Request, res: Response) => {
  const token = await prisma.token.findUnique({
    where: { contractAddress: req.params.address },
  });
  if (!token) return res.status(404).json({ error: 'Token not found' });
  res.json(token);
});

export default router;
