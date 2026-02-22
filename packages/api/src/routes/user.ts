import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyGitHub } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/privatekey', verifyGitHub, async (req: Request, res: Response) => {
  try {
    const ghUser = (req as any).githubUser;
    const user = await prisma.user.findUnique({
      where: { githubUsername: ghUser.login },
      select: { encryptedKey: true, walletAddress: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Deploy a token first.' });
    }

    const { decryptKey } = await import('../services/wallet');
    const privateKey = decryptKey(user.encryptedKey);

    res.json({
      walletAddress: user.walletAddress,
      privateKey: privateKey,
      warning: 'Never share your private key with anyone.',
    });
  } catch (error) {
    console.error('Error fetching private key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;