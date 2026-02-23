import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ethers } from 'ethers';
import { getGitHubToken } from '../lib/github';
import { api } from '../lib/api';

export const claimCmd = new Command('claim')
  .description('Check your creator fee wallet balance')
  .action(async () => {

  const spinner = ora('Checking GitHub authentication...').start();
  const token = getGitHubToken();
  if (!token) {
    spinner.fail('Run: gh auth login first!');
    process.exit(1);
  }
  spinner.succeed('Authenticated');

  const infoSpinner = ora('Fetching wallet info...').start();

  try {
    const { data: user } = await api.get('/api/user/me', {
      headers: { 'x-github-token': token },
    });
    infoSpinner.succeed('Wallet found');

    // Cek balance ETH
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const balance  = await provider.getBalance(user.walletAddress);
    const ethBal   = parseFloat(ethers.formatEther(balance));

    console.log('\n' + chalk.cyan('💰 Creator Fee Wallet\n'));
    console.log(`  GitHub        : @${chalk.green(user.githubUsername)}`);
    console.log(`  Wallet Address: ${chalk.cyan(user.walletAddress)}`);
    console.log(`  Balance       : ${chalk.green(ethBal.toFixed(6) + ' ETH')} (Base Mainnet)`);
    console.log(`  USD (est.)    : ~$${(ethBal * 3400).toFixed(2)}`);
    console.log(`  Total Tokens  : ${user.totalTokens}`);
    console.log(`  BaseScan      : ${chalk.blue(user.baseScanWallet)}`);

    if (user.tokens.length > 0) {
      console.log(chalk.cyan('\n  Your Tokens:\n'));
      user.tokens.forEach((t: any) => {
        console.log(`  • ${chalk.bold(t.name)} (${t.symbol}) — ${t.contractAddress.slice(0, 10)}...`);
      });
    }

    console.log('');
    console.log(chalk.gray('  Fee (90% of all trades) flows directly to your wallet. (10% goes to DaiLaunch platform)'));
    console.log(chalk.gray('  Import wallet address to MetaMask to withdraw anytime.\n'));

  } catch (err: any) {
    infoSpinner.fail('Failed');
    const msg = err.response?.data?.error || err.message;
    console.error(chalk.red(`\n  ${msg}\n`));
    if (msg.includes('not found')) {
      console.log(chalk.yellow('  Deploy a token first: dailaunch deploy\n'));
    }
    process.exit(1);
  }
});
