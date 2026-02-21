"use client";
/**
 * TokenDetailClient.tsx
 *
 * Paste konten dari TokenDetailPage.jsx yang sudah dibuat sebelumnya ke sini.
 * Ubah nama default export menjadi TokenDetailClient dan terima props:
 *
 * interface Props {
 *   token: any;  // data dari database
 * }
 *
 * Ganti MOCK_TOKEN → token dari props
 * Ganti MOCK_TRADES → fetch dari DexScreener API atau kosongkan dulu
 *
 * DexScreener iframe sudah langsung pakai contractAddress dari props.token.contractAddress
 */

export default function TokenDetailClient({ token }: { token: any }) {
  const dexUrl = `https://dexscreener.com/base/${token.contractAddress}?embed=1&theme=dark&trades=1&info=0`;

  // TODO: Paste kode dari TokenDetailPage.jsx di sini
  // Ganti MOCK_TOKEN → token

  return (
    <div style={{ padding: 24, color: '#e2e8f0' }}>
      <h1 style={{ fontSize: 28, color: '#22d3a5', fontWeight: 800 }}>
        {token.name} ({token.symbol})
      </h1>
      <p style={{ marginTop: 8, color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>
        {token.contractAddress}
      </p>
      <div style={{ marginTop: 24, borderRadius: 12, overflow: 'hidden', height: 500 }}>
        <iframe
          src={dexUrl}
          width="100%"
          height="500"
          style={{ border: 'none', display: 'block' }}
          title="DexScreener Chart"
        />
      </div>
      <pre style={{ marginTop: 20, background: '#0f172a', padding: 20, borderRadius: 8, fontSize: 12, color: '#7dd3c8' }}>
        {JSON.stringify(token, null, 2)}
      </pre>
    </div>
  );
}
