import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';

export function getGitHubToken(): string | null {
  try {
    return execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] }).trim();
  } catch {
    return null;
  }
}

export async function getGitHubUser(token: string) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.users.getAuthenticated();
  return data;
}
