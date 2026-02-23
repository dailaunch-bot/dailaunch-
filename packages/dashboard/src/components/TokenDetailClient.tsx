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
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function shortAddr(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function avatarColor(addr: string): string {
  const colors = [
    "#4c1d95","#1e3a8a","#14532d","#7c2d12","#1e3a5f",
    "#6b21a8","#164e63","#713f12","#3b0764","#0c4a6e",
  ];
  const idx = addr ? (addr.charCodeAt(2) ?? 0) % colors.length : 0;
  return colors[idx];
}

export default function TokenDetailClient({ token }: { token: Token }) {
  const router = useRouter();
  const dexUrl = `https://dexscreener.com/base/${token.contractAddress}?embed=1&theme=dark&trades=1&info=0`;
  const change = token.priceChange24h ?? 0;
  const isUp = change >= 0;

  const c = {
    bg: "var(--bg)",
    surface: "var(--surface)",
    border: "1px solid var(--border)",
    borderBright: "1px solid var(--border-bright)",
    purple: "var(--purple)",
    purpleLight: "var(--purple-light)",
    purpleDim: "var(--purple-dim)",
    green: "var(--green)",
    red: "var(--red)",
    text: "var(--text)",
    muted: "var(--text-muted)",
    dim: "var(--text-dim)",
    mono: "var(--mono)",
    sans: "var(--sans)",
  };

  const statRow = (label: string, value: string) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: c.dim, fontFamily: c.mono }}>{label}</span>
      <span style={{ fontSize: 13, color: c.text, fontFamily: c.mono }}>{value}</span>
    </div>
  );

  return (
    <>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 40% at 10% 20%, rgba(106,32,240,0.1) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 90% 80%, rgba(80,20,200,0.06) 0%, transparent 60%)" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(100,50,220,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(100,50,220,0.03) 1px, transparent 1px)",
        backgroundSize: "48px 48px" }} />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        {/* NAV */}
        <nav style={{ display: "flex", alignItems: "center", padding: "0 28px", height: 60, borderBottom: "1px solid var(--border)", background: "rgba(8,8,15,0.85)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, gap: 16 }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--purple-dim)", border: "1px solid var(--border-bright)", color: c.text, borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: c.sans }}>
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarColor(token.contractAddress), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: c.text }}>
              {(token.symbol ?? "?")[0]}
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{token.name} <span style={{ color: c.muted, fontWeight: 400, fontSize: 14 }}>({token.symbol})</span></h1>
              <p style={{ fontSize: 11, color: c.dim, fontFamily: c.mono }}>{token.contractAddress}</p>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 7, height: 7, background: c.green, borderRadius: "50%", boxShadow: `0 0 8px ${c.green}`, animation: "blink 2s ease-in-out infinite" }} />
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: c.purple, border: "none", borderRadius: 10, color: "white", fontFamily: c.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
              ⚡ DaiLaunch
            </a>
          </div>
        </nav>

        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
          {/* Price Banner */}
          <div style={{ display: "flex", gap: 32, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 28px", marginBottom: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Price</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: c.text }}>{token.price > 0 ? `$${token.price.toFixed(8)}` : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>24h Change</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: isUp ? c.green : c.red }}>{isUp ? "+" : ""}{change.toFixed(2)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Market Cap</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: c.text }}>{token.marketCap > 0 ? fmt(token.marketCap) : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Volume 24h</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: c.text }}>{token.tradeVolume > 0 ? fmt(token.tradeVolume) : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Liquidity</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: c.text }}>{token.liquidity > 0 ? fmt(token.liquidity) : "—"}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
              <a
                href={`https://app.uniswap.org/swap?outputCurrency=${token.contractAddress}&chain=base`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: c.purple, borderRadius: 12, color: "white", fontFamily: c.sans, fontWeight: 700, fontSize: 15, textDecoration: "none" }}
              >
                🔄 Trade on Uniswap
              </a>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
            {/* Chart */}
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", height: 500 }}>
              <iframe src={dexUrl} width="100%" height="500" style={{ border: "none", display: "block" }} title="DexScreener" />
            </div>

            {/* Right sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Token Stats */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Token Stats</div>
                {statRow("Holders", token.holders > 0 ? token.holders.toLocaleString() : "—")}
                {statRow("Deployed", new Date(token.deployedAt).toLocaleDateString())}
                {statRow("Contract", shortAddr(token.contractAddress))}
                {statRow("TX Hash", shortAddr(token.txHash))}
              </div>

              {/* Creator */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Creator</div>
                {statRow("GitHub", `@${token.deployer}`)}
                {statRow("Wallet", shortAddr(token.creatorWallet))}
                <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.15)", borderRadius: 8, fontSize: 12, color: c.green, fontFamily: c.mono, textAlign: "center" }}>
                  💰 Earning 90% of trading fees
                </div>
              </div>

              {/* Links */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Links</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    token.githubRepo && { href: `https://github.com/${token.githubRepo}`, label: `GitHub · ${token.githubRepo}` },
                    token.twitter && { href: `https://twitter.com/${token.twitter}`, label: `Twitter · @${token.twitter}` },
                    token.website && { href: token.website, label: "Website" },
                    { href: `https://basescan.org/token/${token.contractAddress}`, label: "BaseScan ↗" },
                    { href: `https://dexscreener.com/base/${token.contractAddress}`, label: "DexScreener ↗" },
                  ].filter(Boolean).map((link: { href: string; label: string } | false) => link && (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: "8px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: c.muted, fontSize: 13, textDecoration: "none", display: "block", fontFamily: c.sans, transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = c.text)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = c.muted)}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
