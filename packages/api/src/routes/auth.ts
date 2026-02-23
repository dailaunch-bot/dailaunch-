import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

const CLIENT_ID     = process.env.GITHUB_CLIENT_ID!;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const JWT_SECRET    = process.env.ENCRYPT_SALT || 'dailaunch-secret-2026';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

// GET /auth/github → redirect ke GitHub OAuth
router.get('/github', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'repo user:email',
    allow_signup: 'true',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GET /auth/github/callback → tukar code → token → JWT → redirect dashboard
router.get('/github/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('Missing code');

  try {
    // 1. Tukar code → GitHub access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json() as any;

    if (tokenData.error || !tokenData.access_token) {
      return res.status(401).send(`GitHub OAuth error: ${tokenData.error_description || 'unknown'}`);
    }

    const ghToken = tokenData.access_token;

    // 2. Ambil info user GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const ghUser = await userRes.json() as any;

    // 3. Sign JWT yang berisi github token (encrypted)
    const jwt_token = jwt.sign(
      {
        githubToken: ghToken,
        login:       ghUser.login,
        avatar:      ghUser.avatar_url,
        name:        ghUser.name || ghUser.login,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Redirect ke dashboard dengan token di URL hash (client-side only)
    res.redirect(`${DASHBOARD_URL}?auth=${jwt_token}`);

  } catch (err: any) {
    console.error('[Auth] OAuth error:', err);
    res.status(500).send('Authentication failed');
  }
});

// GET /auth/me → verify JWT dan return user info
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.token as string);

  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    res.json({
      login:       payload.login,
      avatar:      payload.avatar,
      name:        payload.name,
      githubToken: payload.githubToken,
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
