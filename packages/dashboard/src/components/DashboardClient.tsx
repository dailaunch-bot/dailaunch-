"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTokens } from "@/lib/api";

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

interface Stats {
  totalTokens: number;
  totalVolume: number;
  totalMarketCap: number;
  deployedToday: number;
}

interface Props {
  initialStats: Stats;
  initialTokens: Token[];
}

const SORT_OPTIONS = [
  { value: "new", label: "🕐 Newest" },
  { value: "mcap", label: "💎 Market Cap" },
  { value: "volume", label: "📊 Volume" },
  { value: "gain", label: "🚀 Top Gainers" },
  { value: "holders", label: "👥 Holders" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortAddr(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export default function DashboardClient({ initialStats, initialTokens }: Props) {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>(initialTokens || []);
  const [stats] = useState<Stats>(initialStats || { totalTokens: 0, totalVolume: 0, totalMarketCap: 0, deployedToday: 0 });
  const [sort, setSort] = useState("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const fetchTokens = useCallback(async (p: number, s: string, q: string) => {
    setLoading(true);
    try {
      const data = await getTokens(p, s, q);
      setTokens(data.tokens || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
    fetchTokens(1, sort, searchInput);
  };

  const handleSort = (s: string) => {
    setSort(s);
    setPage(1);
    fetchTokens(1, s, search);
  };

  const handlePrev = () => {
    const p = Math.max(1, page - 1);
    setPage(p);
    fetchTokens(p, sort, search);
  };

  const handleNext = () => {
    const p = page + 1;
    setPage(p);
    fetchTokens(p, sort, search);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#04060f" }}>
      <header style={{ borderBottom: "1px solid rgba(34,211,165,0.1)", background: "rgba(4,6,15,0.95)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>⚡</span>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#22d3a5" }}>DaiLaunch</h1>
              <p style={{ fontSize: 11, color: "#475569" }}>Deploy tokens from GitHub commits</p>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#22d3a5", background: "rgba(34,211,165,0.05)", border: "1px solid rgba(34,211,165,0.15)", padding: "6px 14px", borderRadius: 20 }}>🟢 Live</div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Total Tokens", value: stats.totalTokens?.toLocaleString() ?? "0", icon: "🟡" },
            { label: "Total Market Cap", value: fmt(stats.totalMarketCap ?? 0), icon: "💎" },
            { label: "Total Volume", value: fmt(stats.totalVolume ?? 0), icon: "📊" },
            { label: "Deployed Today", value: stats.deployedToday?.toLocaleString() ?? "0", icon: "🚀" },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(34,211,165,0.1)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginTop: 6 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input type="text" placeholder="Search name or symbol…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(34,211,165,0.15)", borderRadius: 8, padding: "8px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: 240 }} />
            <button type="submit" style={{ background: "rgba(34,211,165,0.1)", border: "1px solid rgba(34,211,165,0.2)", color: "#22d3a5", borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}>Search</button>
          </form>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SORT_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => handleSort(o.value)} style={{ background: sort === o.value ? "rgba(34,211,165,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${sort === o.value ? "rgba(34,211,165,0.4)" : "rgba(255,255,255,0.06)"}`, color: sort === o.value ? "#22d3a5" : "#64748b", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#475569", fontWeight: 600, textTransform: "uppercase" as const }}>
            <span>Token</span>
            <span style={{ textAlign: "right" as const }}>Price</span>
            <span style={{ textAlign: "right" as const }}>24h</span>
            <span style={{ textAlign: "right" as const }}>Market Cap</span>
            <span style={{ textAlign: "right" as const }}>Volume</span>
            <span style={{ textAlign: "right" as const }}>Age</span>
          </div>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center" as const, color: "#475569" }}>⏳ Loading…</div>
          ) : tokens.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" as const, color: "#475569" }}>🔍 No tokens found</div>
          ) : (
            tokens.map((token, i) => {
              const change = token.priceChange24h ?? 0;
              const isUp = change >= 0;
              return (
                <div key={token.id} onClick={() => router.push(`/token/${token.contractAddress}`)} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", padding: "14px 20px", borderBottom: i < tokens.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", alignItems: "center" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34,211,165,0.04)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `hsl(${(token.contractAddress.charCodeAt(2) ?? 0) * 5 % 360}, 60%, 25%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                      {token.symbol?.[0] ?? "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 14 }}>{token.name}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{token.symbol} · {shortAddr(token.contractAddress)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" as const, fontSize: 14, color: "#e2e8f0" }}>{token.price > 0 ? `$${token.price.toFixed(6)}` : "—"}</div>
                  <div style={{ textAlign: "right" as const, fontSize: 14, fontWeight: 600, color: isUp ? "#22d3a5" : "#f87171" }}>{isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%</div>
                  <div style={{ textAlign: "right" as const, fontSize: 14, color: "#94a3b8" }}>{token.marketCap > 0 ? fmt(token.marketCap) : "—"}</div>
                  <div style={{ textAlign: "right" as const, fontSize: 14, color: "#94a3b8" }}>{token.tradeVolume > 0 ? fmt(token.tradeVolume) : "—"}</div>
                  <div style={{ textAlign: "right" as const, fontSize: 12, color: "#475569" }}>{timeAgo(token.deployedAt)}</div>
                </div>
              );
            })
          )}
        </div>

        {tokens.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
            <button onClick={handlePrev} disabled={page === 1} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: page === 1 ? "#334155" : "#94a3b8", borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer" }}>← Prev</button>
            <span style={{ padding: "8px 14px", fontSize: 13, color: "#475569" }}>Page {page}</span>
            <button onClick={handleNext} disabled={tokens.length < 20} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: tokens.length < 20 ? "#334155" : "#94a3b8", borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: tokens.length < 20 ? "not-allowed" : "pointer" }}>Next →</button>
          </div>
        )}
      </main>
    </div>
  );
}