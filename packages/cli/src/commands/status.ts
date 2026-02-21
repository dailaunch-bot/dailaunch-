import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getGitHubToken } from '../lib/github';
import { api } from '../lib/api';

export const statusCmd = new Command('status')
  .description('Check DaiLaunch platform stats')
  .action(async () => {

  const spinner = ora('Fetching platform stats...').start();

  try {
    const [statsRes, tokensRes] = await Promise.all([
      api.get('/api/stats'),
      api.get('/api/tokens?limit=5&sort=new'),
    ]);

    spinner.succeed('Stats loaded');

    const s = statsRes.data;
    console.log('\n' + chalk.cyan('⚡ DaiLaunch Platform Stats\n'));
    console.log(`  Total Tokens  : ${chalk.bold(s.totalTokens)}`);
    console.log(`  Today         : ${chalk.green('+' + s.deployedToday + ' tokens')}`);
    console.log(`  Total Volume  : $${(s.totalVolume / 1e6).toFixed(2)}M`);
    console.log('');

    const tokens = tokensRes.data.tokens;
    if (tokens.length > 0) {
      console.log(chalk.cyan('  Latest Tokens:\n'));
      tokens.forEach((t: any) => {
        const pos = t.priceChange24h >= 0;
        const ch  = pos ? chalk.green(`+${t.priceChange24h.toFixed(1)}%`) : chalk.red(`${t.priceChange24h.toFixed(1)}%`);
        console.log(`  • ${chalk.bold(t.symbol.padEnd(8))} ${t.name.padEnd(20)} ${ch}`);
      });
    }
    console.log('');

  } catch (err: any) {
    spinner.fail('Failed to fetch stats');
    console.error(chalk.red(err.message));
    process.exit(1);
  }
});
