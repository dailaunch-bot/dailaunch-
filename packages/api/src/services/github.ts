await params.octokit.repos.createForAuthenticatedUser({
  name: repoName,
  description: `DaiLaunch Token: ${params.name} (${params.symbol}) on Base`,
  auto_init: false,  // ✅ tidak auto buat README
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
