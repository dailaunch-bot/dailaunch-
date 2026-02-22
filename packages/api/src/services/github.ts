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
}

export async function saveTokenToGitHub(params: SaveTokenParams): Promise<string> {
  const repoName = `dailaunch-${params.symbol.toLowerCase()}-${Date.now()}`;

  // Buat repo baru untuk token ini
  await params.octokit.repos.createForAuthenticatedUser({
    name: repoName,
    description: `DaiLaunch Token: ${params.name} (${params.symbol}) on Base`,
    auto_init: true,
    private: false,
  });

  // token-info.json
  const metadata = {
    name: params.name,
    symbol: params.symbol,
    contractAddress: params.contractAddress,
    creatorFeeWallet: params.creatorWallet,
    chain: 'base',
    chainId: 8453,
    social: {
      twitter: params.twitter || null,
      website: params.website || null,
logo: params.logoUrl || null,
    },
    deployedBy: params.githubUser,
    deployTxHash: params.txHash,
    deployedAt: new Date().toISOString(),
    platform: 'DaiLaunch',
    baseScan: `https://basescan.org/token/${params.contractAddress}`,
    dexScreener: `https://dexscreener.com/base/${params.contractAddress}`,
  };

  const metaContent = Buffer.from(JSON.stringify(metadata, null, 2)).toString('base64');

  await params.octokit.repos.createOrUpdateFileContents({
    owner: params.githubUser,
    repo: repoName,
    path: 'token-info.json',
    message: '🚀 Deploy token via DaiLaunch',
    content: metaContent,
  });

  // README.md
  const readme = buildReadme(params);
  const readmeContent = Buffer.from(readme).toString('base64');

  await params.octokit.repos.createOrUpdateFileContents({
    owner: params.githubUser,
    repo: repoName,
    path: 'README.md',
    message: '📄 Add token README',
    content: readmeContent,
  });

  return `https://github.com/${params.githubUser}/${repoName}`;
}

function buildReadme(params: SaveTokenParams): string {
  return `# ${params.name} (${params.symbol})
${params.logoUrl ? `<p align="center"><img src="${params.logoUrl}" width="200" alt="${params.name} logo"/></p>\n` : ''}

> Deployed via [DaiLaunch](https://dailaunch.xyz) on Base chain

## Token Info

| Field | Value |
|-------|-------|
| **Name** | ${params.name} |
| **Symbol** | ${params.symbol} |
| **Contract** | \`${params.contractAddress}\` |
| **Chain** | Base Mainnet (8453) |
| **Deployed By** | [@${params.githubUser}](https://github.com/${params.githubUser}) |
| **Creator Fee Wallet** | \`${params.creatorWallet}\` |

## Links

- 🔍 [View on BaseScan](https://basescan.org/token/${params.contractAddress})
- 📊 [View on DexScreener](https://dexscreener.com/base/${params.contractAddress})
- 🌐 [View on DaiLaunch](https://dailaunch.xyz/token/${params.contractAddress})
${params.twitter ? `- 🐦 [Twitter](${params.twitter})` : ''}
${params.website ? `- 🌐 [Website](${params.website})` : ''}

## Deploy TX

[\`${params.txHash}\`](https://basescan.org/tx/${params.txHash})

---

*Deployed with [DaiLaunch](https://dailaunch.xyz) — Token Launchpad on Base*
`;
}
