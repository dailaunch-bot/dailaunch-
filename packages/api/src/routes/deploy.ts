import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { ethers } from 'ethers';
import { deployTokenViaClanker } from '../services/clanker';
import { saveTokenToGitHub } from '../services/github';
import { generateWallet, encryptKey } from '../services/wallet';
import { verifyGitHub } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ─── Konstanta Fee ────────────────────────────────────────────────────────────
// 10% dari setiap deploy fee masuk ke wallet platform DaiLaunch
// 90% trading fee dari setiap swap masuk ke creator wallet
const PLATFORM_FEE_PERCENT = 10;
const CREATOR_FEE_PERCENT  = 90;

// Platform mengambil fee statis saat deploy (dalam ETH)
// Opsional: set ke "0" jika tidak ingin charge deploy fee
const DEPLOY_FEE_ETH = process.env.DEPLOY_FEE_ETH || '0';

// ─────────────────────────────────────────────────────────────────────────────

// POST /api/deploy
router.post('/', verifyGitHub, async (req: Request, res: Response) => {
  const { name, symbol, twitter, website, logoUrl } = req.body;
  const ghUser  = (req as any).githubUser;
  const octokit = (req as any).octokit as Octokit;

  if (!name || !symbol) {
    return res.status(400).json({ error: 'name and symbol are required' });
  }
  if (symbol.length > 10) {
    return res.status(400).json({ error: 'symbol max 10 characters' });
  }

  try {
    // ── 1. Pastikan user & creator wallet ada ──────────────────────────────
    let user = await prisma.user.findUnique({
      where: { githubUsername: ghUser.login },
    });

    if (!user) {
      const { address, privateKey } = generateWallet();
      user = await prisma.user.create({
        data: {
          githubUsername: ghUser.login,
          walletAddress:  address,
          encryptedKey:   encryptKey(privateKey),
        },
      });
    }

    // ── 2. Deploy token via Clanker SDK ────────────────────────────────────
    // rewardsConfig sudah di-set di clanker.ts:
    //   creatorReward: 90  → 90% trading fee ke creator
    //   interfaceReward:10 → 10% trading fee ke platform DaiLaunch
    console.log(`[DaiLaunch] Deploying ${name} (${symbol}) for @${ghUser.login}...`);
    console.log(`[DaiLaunch] Fee split: ${CREATOR_FEE_PERCENT}% creator / ${PLATFORM_FEE_PERCENT}% platform`);

    const deployResult = await deployTokenViaClanker({
      name,
      symbol,
      twitter,
      website,
      creatorWallet: user.walletAddress,
      githubUser:    ghUser.login,
    });

    console.log(`[DaiLaunch] Deployed: ${deployResult.contractAddress}`);

    // ── 3. Simpan token ke database ────────────────────────────────────────
    const token = await prisma.token.create({
      data: {
        contractAddress: deployResult.contractAddress,
        name,
        symbol,
        deployer:     ghUser.login,
        creatorWallet: user.walletAddress,
        twitter:      twitter || null,
        website:      website || null,
        txHash:       deployResult.txHash,
        githubRepo:   '',
      },
    });

    // ── 4. Buat GitHub repo untuk token ───────────────────────────────────
    const repoUrl = await saveTokenToGitHub({
      octokit,
      githubUser:      ghUser.login,
      name,
      symbol,
      contractAddress: deployResult.contractAddress,
      creatorWallet:   user.walletAddress,
      txHash:          deployResult.txHash,
      twitter,
      website,
      logoUrl,
    });

    await prisma.token.update({
      where: { id: token.id },
      data:  { githubRepo: repoUrl },
    });

    // ── 5. Response ────────────────────────────────────────────────────────
    res.json({
      success:         true,
      contractAddress: deployResult.contractAddress,
      txHash:          deployResult.txHash,
      creatorWallet:   user.walletAddress,
      githubRepo:      repoUrl,
      baseScan:        `https://basescan.org/token/${deployResult.contractAddress}`,
      dexScreener:     `https://dexscreener.com/base/${deployResult.contractAddress}`,
      feeInfo: {
        creatorTradingFee:  `${CREATOR_FEE_PERCENT}% dari setiap swap masuk ke creator wallet`,
        platformTradingFee: `${PLATFORM_FEE_PERCENT}% dari setiap swap masuk ke DaiLaunch platform`,
        platformWallet:     process.env.PLATFORM_WALLET_ADDRESS,
      },
    });

  } catch (err: any) {
    console.error('[DaiLaunch] Deploy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
