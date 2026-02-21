import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getGitHubToken, getGitHubUser } from '../lib/github';
import { api } from '../lib/api';

export const deployCmd = new Command('deploy')
  .description('Deploy a new token on Base chain')
  .action(async () => {

  // ── Step 1: Cek GitHub Auth ────────────────────────────────────────────────
  const spinner = ora('Checking GitHub authentication...').start();

  const token = getGitHubToken();
  if (!token) {
    spinner.fail('GitHub not authenticated!');
    console.log(chalk.red('\nPlease run: gh auth login\n'));
    process.exit(1);
  }

  let ghUser: any;
  try {
    ghUser = await getGitHubUser(token);
    spinner.succeed(`GitHub: ${chalk.green('@' + ghUser.login)}`);
  } catch {
    spinner.fail('Failed to get GitHub user info');
    process.exit(1);
  }

  // ── Step 2: Input token details ────────────────────────────────────────────
  console.log(chalk.cyan('\n📝 Token Details\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Token Name:',
      validate: (v: string) => v.trim().length > 0 || 'Token name is required',
    },
    {
      type: 'input',
      name: 'symbol',
      message: 'Ticker Symbol (e.g. DGRKT):',
      validate: (v: string) =>
        (v.trim().length > 0 && v.trim().length <= 10) || 'Symbol required, max 10 chars',
      filter: (v: string) => v.toUpperCase().trim(),
    },
    {
      type: 'input',
      name: 'twitter',
      message: 'Twitter/X URL (optional, press Enter to skip):',
      default: '',
    },
    {
      type: 'input',
      name: 'website',
      message: 'Website URL (optional, press Enter to skip):',
      default: '',
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (ans: any) =>
        `Deploy ${chalk.bold(ans.name)} (${chalk.bold(ans.symbol)}) to Base?`,
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(chalk.yellow('Deployment cancelled.'));
    process.exit(0);
  }

  // ── Step 3: Deploy via API ─────────────────────────────────────────────────
  console.log('');
  const deploySpinner = ora('Deploying token to Base via Clanker... (may take 1-2 minutes)').start();

  try {
    const { data } = await api.post('/api/deploy', {
      name:    answers.name,
      symbol:  answers.symbol,
      twitter: answers.twitter || undefined,
      website: answers.website || undefined,
    }, {
      headers: { 'x-github-token': token },
    });

    deploySpinner.succeed('Token deployed successfully!');

    console.log('\n' + chalk.green('✅ Deployment Complete!\n'));
    console.log(`  Token Name    : ${chalk.bold(answers.name)}`);
    console.log(`  Symbol        : ${chalk.bold(answers.symbol)}`);
    console.log(`  Contract      : ${chalk.cyan(data.contractAddress)}`);
    console.log(`  Creator Wallet: ${chalk.cyan(data.creatorWallet)}`);
    console.log(`  GitHub Repo   : ${chalk.cyan(data.githubRepo)}`);
    console.log(`  TX Hash       : ${chalk.gray(data.txHash)}`);
    console.log(`  BaseScan      : ${chalk.blue(data.baseScan)}`);
    console.log(`  DexScreener   : ${chalk.blue(data.dexScreener)}`);
    console.log('');
    console.log(chalk.yellow('  💰 80% of all trading fees go to your creator wallet'));
    console.log(chalk.yellow('  📊 Run: dailaunch claim  — to check your fee balance\n'));

  } catch (err: any) {
    deploySpinner.fail('Deployment failed!');
    const msg = err.response?.data?.error || err.message;
    console.error(chalk.red(`\n  Error: ${msg}\n`));
    process.exit(1);
  }
});
