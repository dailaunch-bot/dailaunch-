import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function startIndexer() {
  console.log('📡 DexScreener indexer started');
  await updateAllTokenStats();
  setInterval(updateAllTokenStats, 5 * 60 * 1000); // every 5 minutes
}

async function updateAllTokenStats() {
  try {
    const tokens = await prisma.token.findMany({
      select: { contractAddress: true },
    });

    if (tokens.length === 0) return;

    console.log(`Updating ${tokens.length} tokens from DexScreener...`);

    for (const token of tokens) {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token.contractAddress}`
        );
        const data = await res.json() as any;
        const pair = data.pairs?.[0];
        if (!pair) continue;

        await prisma.token.update({
          where: { contractAddress: token.contractAddress },
          data: {
            price:         parseFloat(pair.priceUsd || '0'),
            tradeVolume:   parseFloat(pair.volume?.h24 || '0'),
            marketCap:     parseFloat(pair.marketCap || '0'),
            liquidity:     parseFloat(pair.liquidity?.usd || '0'),
            priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
          },
        });
      } catch (err) {
        console.error(`Failed to update ${token.contractAddress}:`, err);
      }
    }
    console.log('✅ Token stats updated');
  } catch (err) {
    console.error('Indexer error:', err);
  }
}
