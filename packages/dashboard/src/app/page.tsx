import { getStats, getTokens } from '@/lib/api';
import DashboardClient from '@/components/DashboardClient';

export default async function HomePage() {
  const [stats, tokensData] = await Promise.all([
    getStats(),
    getTokens(1, 'new'),
  ]);

  return <DashboardClient initialStats={stats} initialTokens={tokensData.tokens} />;
}
