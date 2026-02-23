import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getGitHubToken, getGitHubUser } from '../lib/github';
import { api } from '../lib/api';

export const deployCmd = new Command('deploy')
  .description('Deploy a new token on Base chain')
  .option('--testnet', 'Dry-run simulation mode (no real deployment)')
  .action(async (options) => {
  const isTestnet = options.testnet || false;

  if (isTestnet) {
    console.log(chalk.yellow('\n⚠️  TESTNET MODE — Simulation only, nothing will be deployed\n'));
  }

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
  type: 'input',
  name: 'logoUrl',
  message: 'Logo Image URL (optional, press Enter to skip):',
  default: '',
},
    {
      type: 'confirm',
      name: 'confirm',
      message: (ans: any) =>
        isTestnet
          ? `Simulate deploy ${chalk.bold(ans.name)} (${chalk.bold(ans.symbol)}) in testnet mode?`
          : `Deploy ${chalk.bold(ans.name)} (${chalk.bold(ans.symbol)}) to Base mainnet?`,
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(chalk.yellow('Deployment cancelled.'));
    process.exit(0);
  }

  console.log('');

  if (isTestnet) {
    // Simulate deployment
    const deploySpinner = ora('Simulating token deployment...').start();
    await new Promise(r => setTimeout(r, 2000));
    deploySpinner.succeed('Simulation complete!');

    const fakeContract = '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    const fakeTx = '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    console.log('\n' + chalk.yellow('🧪 SIMULATION RESULT (not real)\n'));
    console.log(`  Token Name    : ${chalk.bold(answers.name)}`);
    console.log(`  Symbol        : ${chalk.bold(answers.symbol)}`);
    console.log(`  Contract      : ${chalk.cyan(fakeContract)}`);
    console.log(`  TX Hash       : ${chalk.gray(fakeTx)}`);
    console.log(`  BaseScan      : ${chalk.blue('https://sepolia.basescan.org/token/' + fakeContract)}`);
const fakeRepo = `https://github.com/${ghUser.login}/dailaunch-${answers.symbol.toLowerCase()}-${Date.now()}`;
console.log(`  GitHub Repo   : ${chalk.cyan(fakeRepo)} (simulated)`);
console.log(`  Token Info    : ${chalk.cyan(fakeRepo + '/blob/main/token-info.json')} (simulated)`);
    console.log('');
    console.log(chalk.green('  ✅ Simulation successful! Run without --testnet to deploy for real.\n'));
    return;
  }

  const deploySpinner = ora('Deploying token to Base via Clanker... (may take 1-2 minutes)').start();

  try {
    const { data } = await api.post('/api/deploy', {
      name:    answers.name,
      symbol:  answers.symbol,
      twitter: answers.twitter || undefined,
      website: answers.website || undefined,
	logoUrl: answers.logoUrl || undefined,
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
console.log(`  Token Info    : ${chalk.cyan(data.githubRepo + '/blob/main/token-info.json')}`);
console.log(`  Token README  : ${chalk.cyan(data.githubRepo + '/blob/main/README.md')}`);
    console.log(`  TX Hash       : ${chalk.gray(data.txHash)}`);
    console.log(`  BaseScan      : ${chalk.blue(data.baseScan)}`);
    console.log(`  DexScreener   : ${chalk.blue(data.dexScreener)}`);
    console.log('');
    console.log(chalk.yellow('  💰 90% of all trading fees go to your creator wallet (10% to DaiLaunch platform)'));
    console.log(chalk.yellow('  📊 Run: dailaunch claim  — to check your fee balance\n'));

  } catch (err: any) {
    deploySpinner.fail('Deployment failed!');
    const msg = err.response?.data?.error || err.message;
    console.error(chalk.red(`\n  Error: ${msg}\n`));
    process.exit(1);
  }
});