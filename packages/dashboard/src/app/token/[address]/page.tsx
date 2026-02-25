import { getToken } from '@/lib/api';
import { notFound } from 'next/navigation';
import TokenDetailClient from '@/components/TokenDetailClient';

export const dynamic = 'force-dynamic';

export default async function TokenPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const token = await getToken(address);
  if (!token) notFound();

  return <TokenDetailClient token={token} />;
}
