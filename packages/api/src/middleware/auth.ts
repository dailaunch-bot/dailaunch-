import { Request, Response, NextFunction } from 'express';
import { Octokit } from '@octokit/rest';

export async function verifyGitHub(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const githubToken = req.headers['x-github-token'] as string;
  if (!githubToken) {
    return res.status(401).json({ error: 'Missing x-github-token header' });
  }

  try {
    const octokit = new Octokit({ auth: githubToken });
    const { data } = await octokit.users.getAuthenticated();
    (req as any).githubUser = data;
    (req as any).githubToken = githubToken;
    (req as any).octokit = octokit;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid GitHub token' });
  }
}
