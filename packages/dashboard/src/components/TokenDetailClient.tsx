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

export default function TokenDetailClient({ token }: { token: Token }) {
  const router = useRouter();
  const dexUrl = `https://dexscreener.com/base/${token.contractAddress}?embed=1&theme=dark&trades=1&info=0`;
  const change = token.priceChange24h ?? 0;
  const isUp = change >= 0;

  return (
    <div style={{ minHeight: "100vh", background: "#04060f" }}>
      <header style={{ borderBottom: "1px solid rgba(34,211,165,0.1)", background: "rgba(4,6,15,0.95)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `hsl(${(token.contractAddress.charCodeAt(2) ?? 0) * 5 % 360}, 60%, 25%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
              {token.symbol?.[0] ?? "?"}
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>{token.name} <span style={{ color: "#475569", fontWeight: 400 }}>({token.symbol})</span></h1>
              <p style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>{token.contractAddress}</p>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          <div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Price</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0" }}>{token.price > 0 ? `$${token.price.toFixed(8)}` : "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>24h Change</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: isUp
