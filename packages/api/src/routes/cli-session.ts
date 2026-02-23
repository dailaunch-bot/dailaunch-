import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import { verifyGitHub } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const SESSION_EXPIRE_DAYS = 1;

// ── POST /auth/cli-login ───────────────────────────────────────────────────────
// CLI calls this with GitHub token → returns sessionToken + web URL
// Usage: dailaunch login  (CLI sends x-github-token header)
router.post('/cli-login', verifyGitHub, async (req: Request, res: Response) => {
  const ghUser  = (req as any).githubUser;
  const ghToken = req.headers['x-github-token'] as string;

  try {
    // Generate random session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRE_DAYS);

    // Delete old sessions for this user (cleanup)
    await prisma.webSession.deleteMany({
      where: { githubLogin: ghUser.login },
    });

    // Create new session
    await prisma.webSession.create({
      data: {
        sessionToken,
        githubToken:  ghToken,
        githubLogin:  ghUser.login,
        githubAvatar: ghUser.avatar_url || '',
        githubName:   ghUser.name || ghUser.login,
        expiresAt,
      },
    });

    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dailaunch.online';
    const loginUrl = `${dashboardUrl}?session=${sessionToken}`;

    res.json({
      success: true,
      sessionToken,
      loginUrl,
      user: {
        login:  ghUser.login,
        name:   ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
      },
      expiresAt,
      message: `Open this URL in your browser to login:\n${loginUrl}`,
    });
  } catch (err: any) {
    console.error('[Auth] CLI login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /auth/session?token=xxx ───────────────────────────────────────────────
// Web calls this to verify session token and get user info + GitHub token
router.get('/session', async (req: Request, res: Response) => {
  const { token } = req.query as { token: string };

  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const session = await prisma.webSession.findUnique({
      where: { sessionToken: token },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (new Date() > session.expiresAt) {
      await prisma.webSession.delete({ where: { sessionToken: token } });
      return res.status(401).json({ error: 'Session expired' });
    }

    // Verify GitHub token still valid
    try {
      const octokit = new Octokit({ auth: session.githubToken });
      await octokit.users.getAuthenticated();
    } catch {
      await prisma.webSession.delete({ where: { sessionToken: token } });
      return res.status(401).json({ error: 'GitHub token no longer valid. Please run dailaunch login again.' });
    }

    res.json({
      success: true,
      githubToken:  session.githubToken,
      githubLogin:  session.githubLogin,
      githubAvatar: session.githubAvatar,
      githubName:   session.githubName,
      expiresAt:    session.expiresAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /auth/session ───────────────────────────────────────────────────────
// Logout — invalidate session
router.delete('/session', async (req: Request, res: Response) => {
  const { token } = req.query as { token: string };
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    await prisma.webSession.deleteMany({ where: { sessionToken: token } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
