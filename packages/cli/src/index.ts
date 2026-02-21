#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { deployCmd } from './commands/deploy';
import { claimCmd } from './commands/claim';
import { statusCmd } from './commands/status';

console.log(
  chalk.cyan(figlet.textSync('DaiLaunch', { horizontalLayout: 'full' }))
);
console.log(chalk.gray('  Token Launchpad on Base · Powered by Clanker\n'));

const program = new Command();

program
  .name('dailaunch')
  .description('Deploy tokens on Base chain with GitHub integration')
  .version('1.0.0');

program.addCommand(deployCmd);
program.addCommand(claimCmd);
program.addCommand(statusCmd);

program.parse(process.argv);
