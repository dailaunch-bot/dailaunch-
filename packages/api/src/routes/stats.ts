import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stats
router.get('/', async (_req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalTokens, agg, deployedToday] = await Promise.all([
    prisma.token.count(),
    prisma.token.aggregate({
      _sum: { tradeVolume: true, marketCap: true },
    }),
    prisma.token.count({ where: { deployedAt: { gte: todayStart } } }),
  ]);

  res.json({
    totalTokens,
    totalVolume:  agg._sum.tradeVolume || 0,
    totalMarketCap: agg._sum.marketCap || 0,
    deployedToday,
  });
});

export default router;
