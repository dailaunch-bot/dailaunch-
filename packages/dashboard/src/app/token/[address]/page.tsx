import { getToken } from '@/lib/api';
import { notFound } from 'next/navigation';
import TokenDetailClient from '@/components/TokenDetailClient';

export default async function TokenPage({
  params,
}: {
  params: { address: string };
}) {
  const token = await getToken(params.address);
  if (!token) notFound();

  return <TokenDetailClient token={token} />;
}
