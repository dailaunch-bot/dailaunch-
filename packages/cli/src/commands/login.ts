import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getGitHubToken, getGitHubUser } from '../lib/github';
import { api } from '../lib/api';

export const loginCmd = new Command('login')
  .description('Login to DaiLaunch web dashboard via GitHub')
  .action(async () => {
    console.log(chalk.cyan('\n🔐 DaiLaunch Web Login\n'));

    // 1. Check GitHub auth
    const spinner = ora('Checking GitHub authentication...').start();
    const token = getGitHubToken();

    if (!token) {
      spinner.fail('GitHub not authenticated!');
      console.log(chalk.red('\nPlease run first:\n'));
      console.log(chalk.white('  gh auth login\n'));
      process.exit(1);
    }

    let ghUser: any;
    try {
      ghUser = await getGitHubUser(token);
      spinner.succeed(`GitHub: ${chalk.green('@' + ghUser.login)}`);
    } catch {
      spinner.fail('Failed to verify GitHub token');
      process.exit(1);
    }

    // 2. Create web session via API
    const sessionSpinner = ora('Creating web session...').start();

    try {
      const { data } = await api.post(
        '/auth/cli-login',
        {},
        { headers: { 'x-github-token': token } }
      );

      sessionSpinner.succeed('Web session created!');

      console.log('\n' + chalk.green('✅ Login successful!\n'));
      console.log(`  GitHub   : ${chalk.cyan('@' + ghUser.login)}`);
      console.log(`  Expires  : ${chalk.gray(new Date(data.expiresAt).toLocaleString())}`);
      console.log('');
      console.log(chalk.yellow('  Open this URL in your browser:'));
      console.log('');
      console.log('  ' + chalk.bold.cyan(data.loginUrl));
      console.log('');
      console.log(chalk.gray('  The page will auto-login without any button click.'));
      console.log(chalk.gray('  Session expires in 24 hours.\n'));

    } catch (err: any) {
      sessionSpinner.fail('Failed to create web session');
      const msg = err.response?.data?.error || err.message;
      console.error(chalk.red(`\n  Error: ${msg}\n`));
      process.exit(1);
    }
  });
