import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyGitHub } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/user/me
router.get('/me', verifyGitHub, async (req: Request, res: Response) => {
  const ghUser = (req as any).githubUser;

  const user = await prisma.user.findUnique({
    where: { githubUsername: ghUser.login },
    select: { githubUsername: true, walletAddress: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found. Deploy a token first.' });
  }

  // Ambil semua token milik user ini
  const tokens = await prisma.token.findMany({
    where: { deployer: ghUser.login },
    select: {
      name: true,
      symbol: true,
      contractAddress: true,
      tradeVolume: true,
      deployedAt: true,
    },
    orderBy: { deployedAt: 'desc' },
  });

  res.json({
    githubUsername: user.githubUsername,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
    tokens,
    totalTokens: tokens.length,
    baseScanWallet: `https://basescan.org/address/${user.walletAddress}`,
  });
});

export default router;
