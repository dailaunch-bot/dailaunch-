const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
