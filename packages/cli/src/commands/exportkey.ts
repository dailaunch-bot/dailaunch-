import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getGitHubToken } from '../lib/github';
import { api } from '../lib/api';

export const exportkeyCmd = new Command('exportkey')
  .description('Export your creator wallet private key for MetaMask import')
  .action(async () => {
    const spinner = ora('Checking GitHub authentication...').start();
    const token = getGitHubToken();

    if (!token) {
      spinner.fail('Run: gh auth login first!');
      process.exit(1);
    }
    spinner.succeed('Authenticated');

    const keySpinner = ora('Fetching private key...').start();
    try {
      const { data } = await api.get('/api/user/privatekey', {
        headers: { 'x-github-token': token },
      });

      keySpinner.succeed('Private key retrieved');

      console.log('\n' + chalk.red('⚠️  KEEP THIS PRIVATE KEY SECRET — NEVER SHARE IT\n'));
      console.log(`  Wallet Address : ${chalk.cyan(data.walletAddress)}`);
      console.log(`  Private Key    : ${chalk.yellow(data.privateKey)}`);
      console.log('\n' + chalk.gray('  How to import to MetaMask:'));
      console.log(chalk.gray('  1. Open MetaMask'));
      console.log(chalk.gray('  2. Click account icon → Import Account'));
      console.log(chalk.gray('  3. Paste your Private Key above'));
      console.log(chalk.gray('  4. Switch network to Base Mainnet\n'));

    } catch (err: any) {
      keySpinner.fail('Failed');
      console.error(chalk.red(`\n  Error: ${err.response?.data?.error || err.message}\n`));
      process.exit(1);
    }
  });