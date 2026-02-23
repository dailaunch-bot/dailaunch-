import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { deployTokenViaClanker } from '../services/clanker';
import { saveTokenToGitHub } from '../services/github';
import { generateWallet, encryptKey } from '../services/wallet';

const router = Router();
const prisma = new PrismaClient();

const PLATFORM_GITHUB_TOKEN = process.env.PLATFORM_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
const PLATFORM_GITHUB_USER  = process.env.PLATFORM_GITHUB_USER  || 'dailaunch-platform';

// POST /api/deploy/web  — no GitHub login required from user
// Uses platform's own GitHub token (set in Railway env vars)
router.post('/', async (req: Request, res: Response) => {
  const { name, symbol, twitter, website, logoUrl } = req.body;

  if (!name || !symbol) {
    return res.status(400).json({ error: 'name and symbol are required' });
  }
  if (symbol.length > 10) {
    return res.status(400).json({ error: 'symbol max 10 characters' });
  }
  if (!PLATFORM_GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Platform GitHub token not configured' });
  }

  try {
    const octokit = new Octokit({ auth: PLATFORM_GITHUB_TOKEN });

    // Use platform wallet (shared for web deployments)
    let user = await prisma.user.findUnique({
      where: { githubUsername: PLATFORM_GITHUB_USER },
    });

    if (!user) {
      const { address, privateKey } = generateWallet();
      user = await prisma.user.create({
        data: {
          githubUsername: PLATFORM_GITHUB_USER,
          walletAddress:  address,
          encryptedKey:   encryptKey(privateKey),
        },
      });
    }

    console.log(`[DaiLaunch Web] Deploying ${name} (${symbol})...`);

    const deployResult = await deployTokenViaClanker({
      name,
      symbol,
      twitter,
      website,
      creatorWallet: user.walletAddress,
      githubUser:    PLATFORM_GITHUB_USER,
    });

    console.log(`[DaiLaunch Web] Deployed: ${deployResult.contractAddress}`);

    const token = await prisma.token.create({
      data: {
        contractAddress: deployResult.contractAddress,
        name,
        symbol,
        deployer:      PLATFORM_GITHUB_USER,
        creatorWallet: user.walletAddress,
        twitter:       twitter || null,
        website:       website || null,
        txHash:        deployResult.txHash,
        githubRepo:    '',
      },
    });

    const repoUrl = await saveTokenToGitHub({
      octokit,
      githubUser:      PLATFORM_GITHUB_USER,
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

    res.json({
      success:         true,
      contractAddress: deployResult.contractAddress,
      txHash:          deployResult.txHash,
      creatorWallet:   user.walletAddress,
      githubRepo:      repoUrl,
      baseScan:        `https://basescan.org/token/${deployResult.contractAddress}`,
      dexScreener:     `https://dexscreener.com/base/${deployResult.contractAddress}`,
    });

  } catch (err: any) {
    console.error('[DaiLaunch Web] Deploy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
