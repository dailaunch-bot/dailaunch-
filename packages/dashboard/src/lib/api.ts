// Hardcode API URL - NEXT_PUBLIC_ vars harus ada saat build time
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.dailaunch.online';

export async function getStats() {
  const res = await fetch(`${API}/api/stats`, { next: { revalidate: 30 } });
  return res.json();
}

export async function getTokens(page = 1, sort = 'new', search = '') {
  const params = new URLSearchParams({ page: String(page), sort, limit: '20' });
  if (search) params.set('search', search);
  const res = await fetch(`${API}/api/tokens?${params}`, { next: { revalidate: 10 } });
  return res.json();
}

export async function getToken(address: string) {
  const res = await fetch(`${API}/api/tokens/${address}`, { next: { revalidate: 10 } });
  if (!res.ok) return null;
  return res.json();
}

export async function deployToken(params: {
  name: string;
  symbol: string;
  twitter?: string;
  website?: string;
  logoUrl?: string;
  githubToken?: string; // if provided → use user's GitHub, else platform token
}) {
  const { githubToken, ...body } = params;

  // If user is logged in (has GitHub token), deploy under their account
  // Otherwise, use platform's /api/deploy/web (no auth needed)
  const endpoint = githubToken ? `${API}/api/deploy` : `${API}/api/deploy/web`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (githubToken) headers['x-github-token'] = githubToken;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Deploy failed');
  return data;
}

export async function verifyJWT(token: string) {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export function getGitHubLoginUrl() {
  return `https://api.dailaunch.online/auth/github`;
}
