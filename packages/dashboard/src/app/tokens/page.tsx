import { getStats, getTokens } from '@/lib/api';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function TokensPage() {
  try {
    const [stats, tokensData] = await Promise.all([
      getStats(),
      getTokens(1, 'new'),
    ]);
    return (
      <DashboardClient 
        initialStats={stats} 
        initialTokens={tokensData?.tokens ?? []} 
      />
    );
  } catch {
    return (
      <DashboardClient 
        initialStats={{ totalTokens: 0, totalVolume: 0, totalMarketCap: 0, deployedToday: 0 }} 
        initialTokens={[]} 
      />
    );
  }
}
