import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { verifyGitHub } from '../middleware/auth';
import { decryptKey } from '../services/wallet';

const router = express.Router();
const prisma = new PrismaClient();

// ── Simple in-memory price cache (refresh every 60s) ──────────────────────────
let cachedEthPrice = 0;
let lastPriceFetch = 0;

async function getEthPriceUsd(): Promise<number> {
  const now = Date.now();
  if (cachedEthPrice > 0 && now - lastPriceFetch < 60_000) {
    return cachedEthPrice;
  }
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    // ✅ Fix: cast ke any agar TypeScript tidak error
    const data = await res.json() as any;
    const price = data?.ethereum?.usd;
    if (price && price > 0) {
      cachedEthPrice = price;
      lastPriceFetch = now;
      console.log(`[DaiLaunch] ETH price updated: $${price}`);
      return price;
    }
  } catch (err) {
    console.warn('[DaiLaunch] CoinGecko fetch failed:', err);
  }
  return cachedEthPrice || parseFloat(process.env.ETH_PRICE_FALLBACK || '3400');
}

// ─── GET /api/user/me ─────────────────────────────────────────────────────────
router.get('/me', verifyGitHub, async (req: Request, res: Response) => {
  try {
    const ghUser = (req as any).githubUser;

    const user = await prisma.user.findUnique({
      where: { githubUsername: ghUser.login },
      select: {
        githubUsername: true,
        walletAddress: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Deploy a token first.' });
    }

    const tokens = await prisma.token.findMany({
      where: { deployer: ghUser.login },
      select: {
        name: true,
        symbol: true,
        contractAddress: true,
        deployedAt: true,
        marketCap: true,
        tradeVolume: true,
      },
      orderBy: { deployedAt: 'desc' },
    });

    let balance = '0.000000';
    let balanceUsd = '0.00';
    let ethPriceUsd = 0;

    try {
      const [balanceResult, price] = await Promise.all([
        new ethers.JsonRpcProvider(
          process.env.BASE_RPC_URL || 'https://mainnet.base.org'
        ).getBalance(user.walletAddress),
        getEthPriceUsd(),
      ]);

      ethPriceUsd = price;
      const ethBal = parseFloat(ethers.formatEther(balanceResult));
      balance = ethBal.toFixed(6);
      balanceUsd = ethPriceUsd > 0 ? (ethBal * ethPriceUsd).toFixed(2) : '0.00';

    } catch (err) {
      console.warn('[DaiLaunch] Could not fetch balance/price:', err);
    }

    res.json({
      githubUsername: user.githubUsername,
      walletAddress: user.walletAddress,
      balance,
      balanceUsd,
      ethPriceUsd,
      totalTokens: tokens.length,
      baseScanWallet: `https://basescan.org/address/${user.walletAddress}`,
      tokens: tokens.map(t => ({
        name: t.name,
        symbol: t.symbol,
        contractAddress: t.contractAddress,
        deployedAt: t.deployedAt,
        marketCap: t.marketCap,
        tradeVolume: t.tradeVolume,
      })),
    });

  } catch (error) {
    console.error('[DaiLaunch] Error fetching user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/user/privatekey ─────────────────────────────────────────────────
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

    const privateKey = decryptKey(user.encryptedKey);

    res.json({
      walletAddress: user.walletAddress,
      privateKey,
      warning: 'Never share your private key with anyone.',
    });

  } catch (error: any) {
    console.error('[DaiLaunch] Error fetching private key:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

export default router;
