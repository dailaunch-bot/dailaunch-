import { Octokit } from '@octokit/rest';

interface SaveTokenParams {
  octokit: Octokit;
  githubUser: string;
  name: string;
  symbol: string;
  contractAddress: string;
  repoName?: string;
}

export async function saveTokenToGitHub(params: SaveTokenParams): Promise<string> {
  const repoName = params.repoName || `token-${params.symbol.toLowerCase()}-${Date.now()}`;

  const metaContent = Buffer.from(
    JSON.stringify(
      {
        name: params.name,
        symbol: params.symbol,
        contractAddress: params.contractAddress,
        network: 'Base',
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  ).toString('base64');

  const readmeContent = Buffer.from(
    `# ${params.name} (${params.symbol})\n\nDeployed on Base via DaiLaunch\n\n**Contract:** \`${params.contractAddress}\``
  ).toString('base64');

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

  return repoName;
}
