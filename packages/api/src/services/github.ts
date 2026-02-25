import { Octokit } from '@octokit/rest';

interface SaveTokenParams {
  octokit: Octokit;
  githubUser: string;
  name: string;
  symbol: string;
  contractAddress: string;
  creatorWallet: string;
  txHash: string;
  twitter?: string;
  website?: string;
  logoUrl?: string;
  repoName?: string;
}

export async function saveTokenToGitHub(params: SaveTokenParams): Promise<string> {
  const repoName = params.repoName || `token-${params.symbol.toLowerCase()}-${Date.now()}`;

  const tokenInfo = {
    name: params.name,
    symbol: params.symbol,
    contractAddress: params.contractAddress,
    creatorWallet: params.creatorWallet,
    txHash: params.txHash,
    twitter: params.twitter || null,
    website: params.website || null,
    logoUrl: params.logoUrl || null,
    network: 'Base',
    deployedAt: new Date().toISOString(),
  };

  const metaContent = Buffer.from(JSON.stringify(tokenInfo, null, 2)).toString('base64');

  const readmeLines = [
    `# ${params.name} (${params.symbol})`,
    ``,
    `Deployed on **Base Mainnet** via [DaiLaunch](https://dailaunch.online)`,
    ``,
    `## Token Info`,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Contract | \`${params.contractAddress}\` |`,
    `| Creator Wallet | \`${params.creatorWallet}\` |`,
    `| TX Hash | \`${params.txHash}\` |`,
    params.twitter ? `| Twitter | [@${params.twitter}](https://twitter.com/${params.twitter}) |` : '',
    params.website ? `| Website | ${params.website} |` : '',
    ``,
    `## Links`,
    `- [BaseScan](https://basescan.org/token/${params.contractAddress})`,
    `- [DexScreener](https://dexscreener.com/base/${params.contractAddress})`,
  ].filter(l => l !== '').join('\n');

  const readmeContent = Buffer.from(readmeLines).toString('base64');

  // Buat repo
  await params.octokit.repos.createForAuthenticatedUser({
    name: repoName,
    description: `DaiLaunch Token: ${params.name} (${params.symbol}) on Base`,
    auto_init: false,
    private: false,
  });

  // Tunggu repo siap
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Push token-info.json
  await params.octokit.repos.createOrUpdateFileContents({
    owner: params.githubUser,
    repo: repoName,
    path: 'token-info.json',
    message: '🚀 Deploy token via DaiLaunch',
    content: metaContent,
  });

  // Push README.md
  await params.octokit.repos.createOrUpdateFileContents({
    owner: params.githubUser,
    repo: repoName,
    path: 'README.md',
    message: '📄 Add token README',
    content: readmeContent,
  });

  return `https://github.com/${params.githubUser}/${repoName}`;
}
