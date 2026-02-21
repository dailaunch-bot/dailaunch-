"use client";
import { useRouter } from "next/navigation";
interface Token {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  deployer: string;
  creatorWallet: string;
  githubRepo: string;
  twitter?: string;
  website?: string;
  txHash: string;
  deployedAt: string;
  tradeVolume: number;
  price: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  priceChange24h: number;
}
function fmt(n: number): string {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(2) + "K";
  return "$" + n.toFixed(2);
}
function shortAddr(addr: string): string {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "";
}
export default function TokenDetailClient({ token }: { token: Token }) {
  const router = useRouter();
  const dexUrl = "https://dexscreener.com/base/" + token.contractAddress + "?embed=1&theme=dark&trades=1&info=0";
  const change = token.priceChange24h ?? 0;
  const isUp = change >= 0;
  const green = "#22d3a5";
  const red = "#f87171";
  const dim = "#475569";
  const muted = "#94a3b8";
  const light = "#e2e8f0";
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 };
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const linkStyle: React.CSSProperties = { padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: muted, fontSize: 13, textDecoration: "none", display: "block" };
  return (
    <div style={{ minHeight: "100vh", background: "#04060f" }}>
      <header style={{ borderBottom: "1px solid rgba(34,211,165,0.1)", background: "rgba(4,6,15,0.95)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: muted, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
            Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "hsl(" + ((token.contractAddress.charCodeAt(2) ?? 0) * 5 % 360) + ", 60%, 25%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: light }}>
              {token.symbol?.[0] ?? "?"}
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: light }}>{token.name} <span style={{ color: dim, fontWeight: 400 }}>({token.symbol})</span></h1>
              <p style={{ fontSize: 12, color: dim, fontFamily: "monospace" }}>{token.contractAddress}</p>
            </div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          <div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, display: "flex", gap: 32 }}>
              <div><div style={{ fontSize: 12, color: dim, marginBottom: 4 }}>Price</div><div style={{ fontSize: 28, fontWeight: 700, color: light }}>{token.price > 0 ? "$" + token.price.toFixed(8) : "—"}</div></div>
              <div><div style={{ fontSize: 12, color: dim, marginBottom: 4 }}>24h Change</div><div style={{ fontSize: 22, fontWeight: 700, color: isUp ? green : red }}>{isUp ? "+" : ""}{change.toFixed(2)}%</div></div>
              <div><div style={{ fontSize: 12, color: dim, marginBottom: 4 }}>Market Cap</div><div style={{ fontSize: 22, fontWeight: 600, color: light }}>{token.marketCap > 0 ? fmt(token.marketCap) : "—"}</div></div>
              <div><div style={{ fontSize: 12, color: dim, marginBottom: 4 }}>Volume</div><div style={{ fontSize: 22, fontWeight: 600, color: light }}>{token.tradeVolume > 0 ? fmt(token.tradeVolume) : "—"}</div></div>
            </div>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", height: 500 }}>
              <iframe src={dexUrl} width="100%" height="500" style={{ border: "none", display: "block" }} title="DexScreener" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: muted, marginBottom: 16 }}>TOKEN STATS</h2>
              <div style={row}><span style={{ fontSize: 13, color: dim }}>Liquidity</span><span style={{ fontSize: 13, color: light }}>{token.liquidity > 0 ? fmt(token.liquidity) : "—"}</span></div>
              <div style={row}><span style={{ fontSize: 13, color: dim }}>Holders</span><span style={{ fontSize: 13, color: light }}>{token.holders > 0 ? token.holders.toLocaleString() : "—"}</span></div>
              <div style={row}><span style={{ fontSize: 13, color: dim }}>Deployed</span><span style={{ fontSize: 13, color: light }}>{new Date(token.deployedAt).toLocaleDateString()}</span></div>
            </div>
            <div style={card}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: muted, marginBottom: 16 }}>LINKS</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {token.githubRepo && <a href={"https://github.com/" + token.githubRepo} target="_blank" rel="noopener noreferrer" style={linkStyle}>GitHub · {token.githubRepo}</a>}
                {token.twitter && <a href={"https://twitter.com/" + token.twitter} target="_blank" rel="noopener noreferrer" style={linkStyle}>Twitter · @{token.twitter}</a>}
                {token.website && <a href={token.website} target="_blank" rel="noopener noreferrer" style={linkStyle}>Website</a>}
                <a href={"https://basescan.org/token/" + token.contractAddress} target="_blank" rel="noopener noreferrer" style={linkStyle}>BaseScan</a>
              </div>
            </div>
            <div style={card}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: muted, marginBottom: 16 }}>CREATOR</h2>
              <div style={row}><span style={{ fontSize: 13, color: dim }}>GitHub</span><span style={{ fontSize: 13, color: light, fontFamily: "monospace" }}>@{token.deployer}</span></div>
              <div style={row}><span style={{ fontSize: 13, color: dim }}>Wallet</span><span style={{ fontSize: 13, color: light, fontFamily: "monospace" }}>{shortAddr(token.creatorWallet)}</span></div>
              <div style={row}><span style={{ fontSize: 13, color: dim }}>Tx</span><span style={{ fontSize: 13, color: light, fontFamily: "monospace" }}>{shortAddr(token.txHash)}</span></div>
            </div>
            <a href={"https://app.uniswap.org/swap?outputCurrency=" + token.contractAddress + "&chain=base"} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg, #22d3a5, #0ea5e9)", color: "#04060f", fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 12, textDecoration: "none" }}>
              Trade on Uniswap
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
