import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { deployTokenViaClanker } from '../services/clanker';
import { saveTokenToGitHub } from '../services/github';
import { generateWallet, encryptKey } from '../services/wallet';
import { verifyGitHub } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/deploy
router.post('/', verifyGitHub, async (req: Request, res: Response) => {
  const { name, symbol, twitter, website, logoUrl } = req.body;
  const ghUser = (req as any).githubUser;
  const octokit = (req as any).octokit as Octokit;

  if (!name || !symbol) {
    return res.status(400).json({ error: 'name and symbol are required' });
  }
  if (symbol.length > 10) {
    return res.status(400).json({ error: 'symbol max 10 characters' });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { githubUsername: ghUser.login },
    });

    if (!user) {
      const { address, privateKey } = generateWallet();
      user = await prisma.user.create({
        data: {
          githubUsername: ghUser.login,
          walletAddress: address,
          encryptedKey: encryptKey(privateKey),
        },
      });
    }

    console.log(`Deploying ${name} (${symbol}) for @${ghUser.login}...`);
    const deployResult = await deployTokenViaClanker({
      name,
      symbol,
      twitter,
      website,
      creatorWallet: user.walletAddress,
      githubUser: ghUser.login,
    });
    console.log(`Deployed: ${deployResult.contractAddress}`);

    const token = await prisma.token.create({
      data: {
        contractAddress: deployResult.contractAddress,
        name,
        symbol,
        deployer: ghUser.login,
        creatorWallet: user.walletAddress,
        twitter: twitter || null,
        website: website || null,
        txHash: deployResult.txHash,
        githubRepo: '',
      },
    });

    const repoUrl = await saveTokenToGitHub({
      octokit,
      githubUser: ghUser.login,
      name,
      symbol,
      contractAddress: deployResult.contractAddress,
      creatorWallet: user.walletAddress,
      txHash: deployResult.txHash,
      twitter,
      website,
logoUrl,
    });

    await prisma.token.update({
      where: { id: token.id },
      data: { githubRepo: repoUrl },
    });

    res.json({
      success: true,
      contractAddress: deployResult.contractAddress,
      txHash: deployResult.txHash,
      creatorWallet: user.walletAddress,
      githubRepo: repoUrl,
      baseScan: `https://basescan.org/token/${deployResult.contractAddress}`,
      dexScreener: `https://dexscreener.com/base/${deployResult.contractAddress}`,
    });
  } catch (err: any) {
    console.error('Deploy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
