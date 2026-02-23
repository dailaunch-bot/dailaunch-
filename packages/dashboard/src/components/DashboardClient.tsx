"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  { value: "new", label: "⚡ Newest" },
  { value: "mcap", label: "💎 Market Cap" },
  { value: "volume", label: "📊 Volume" },
  { value: "gain", label: "🚀 Top Gainers" },
  { value: "holders", label: "👥 Holders" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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

export default function DashboardClient({ initialStats, initialTokens }: Props) {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>(initialTokens || []);
  const [stats] = useState<Stats>(
    initialStats || { totalTokens: 0, totalVolume: 0, totalMarketCap: 0, deployedToday: 0 }
  );
  const [sort, setSort] = useState("new");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployDone, setDeployDone] = useState(false);
  const [deployRunning, setDeployRunning] = useState(false);
  const deployTermRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

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

  // Deploy terminal animation
  async function runDeploy() {
    if (deployRunning || deployDone) return;
    setDeployRunning(true);
    const term = deployTermRef.current;
    if (!term) return;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const append = (html: string) => {
      const div = document.createElement("div");
      div.innerHTML = html;
      term.appendChild(div);
      term.scrollTop = 99999;
    };

    term.innerHTML = `
      <div style="color:rgba(220,210,255,0.25);font-size:12px"># deploy your token on Base mainnet</div>
      <div style="margin-top:4px"><span style="color:var(--purple-light)">$ </span><span style="color:#a87fff">dailaunch deploy</span></div>
    `;

    await sleep(400);
    append(`<div style="color:var(--text-muted);font-size:13px;margin-top:6px">? Token Name: <span id="d-name" style="color:var(--green)"></span><span class="d-cursor" style="display:inline-block;width:2px;height:13px;background:var(--green);vertical-align:middle;animation:blink 1s infinite"></span></div>`);

    const typeIn = async (id: string, text: string, speed = 80) => {
      const el = document.getElementById(id);
      if (!el) return;
      for (const ch of text) {
        el.textContent = (el.textContent || "") + ch;
        await sleep(speed);
      }
    };

    await typeIn("d-name", "My Awesome Token");
    term.querySelector(".d-cursor")?.remove();
    await sleep(200);
    append(`<div style="color:var(--text-muted);font-size:13px">? Symbol: <span style="color:var(--green)">MAT</span></div>`);
    append(`<div style="color:var(--text-muted);font-size:13px">? Twitter: <span style="color:var(--green)">https://x.com/mytoken</span></div>`);
    await sleep(300);
    append(`<br/>`);
    append(`<div style="color:#f59e0b;font-size:13px">⏳ Connecting to Base Mainnet...</div>`);
    await sleep(800);
    append(`<div style="color:#f59e0b;font-size:13px">⏳ Generating creator wallet (AES-256)...</div>`);
    await sleep(700);
    append(`<div style="color:#f59e0b;font-size:13px">⏳ Deploying via Clanker SDK v4...</div>`);
    await sleep(1200);
    append(`<br/>`);
    append(`<div style="color:var(--green);font-size:13px;font-weight:700">✅ Deployment Complete!</div>`);
    await sleep(100);
    append(`<div style="color:var(--text-muted);font-size:12px;margin-top:6px">  Contract  : <span style="color:#a87fff">0xabc...def123</span></div>`);
    append(`<div style="color:var(--text-muted);font-size:12px">  TX Hash   : <span style="color:#a87fff">0xfed...cba987</span></div>`);
    append(`<div style="color:var(--text-muted);font-size:12px">  DexScreener: <span style="color:#6ab0ff;text-decoration:underline">dexscreener.com/base/0xabc...</span></div>`);
    await sleep(200);
    append(`<br/>`);
    append(`<div style="color:var(--green);font-size:12px">💰 90% of all trading fees → your wallet. Forever.</div>`);
    append(`<div style="color:var(--text-muted);font-size:12px;margin-top:4px">Run: <span style="color:#a87fff">dailaunch claim</span> to check balance</div>`);
    append(`<div style="margin-top:8px"><span style="color:var(--purple-light)">$ </span><span style="display:inline-block;width:2px;height:13px;background:var(--purple-light);vertical-align:middle;animation:blink 1s infinite"></span></div>`);

    setDeployRunning(false);
    setDeployDone(true);
  }

  const c = {
    bg: "var(--bg)",
    surface: "var(--surface)",
    surface2: "var(--surface2)",
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

  const statsItems = [
    { label: "TOTAL TOKENS", value: stats.totalTokens?.toLocaleString() ?? "0", change: `+${stats.deployedToday ?? 0} today`, up: true },
    { label: "TOTAL VOLUME", value: fmt(stats.totalVolume ?? 0), change: "↑ 12.4%", up: true },
    { label: "MARKET CAP", value: fmt(stats.totalMarketCap ?? 0), change: "↑ 8.2%", up: true },
    { label: "DEPLOYED TODAY", value: String(stats.deployedToday ?? 0), change: "🚀 live", up: true },
    { label: "CHAIN", value: "Base", change: "Mainnet", up: true, isChain: true },
  ];

  // Build ticker from tokens
  const tickerItems = [...tokens, ...tokens];

  return (
    <>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 40% at 10% 20%, rgba(106,32,240,0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 90% 80%, rgba(80,20,200,0.08) 0%, transparent 60%)" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(100,50,220,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(100,50,220,0.04) 1px, transparent 1px)",
        backgroundSize: "48px 48px" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* NAV */}
        <nav style={{ display: "flex", alignItems: "center", padding: "0 28px", height: 60, borderBottom: "1px solid var(--border)", background: "rgba(8,8,15,0.85)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, gap: 32 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: c.text, letterSpacing: "-0.01em" }}>DaiLaunch</span>
          </a>
          <div style={{ display: "flex", gap: 4 }}>
            {["Dashboard", "Tokens", "My Tokens", "Docs"].map((tab, i) => (
              <div key={tab} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: i === 0 ? c.text : c.muted, cursor: "pointer", background: i === 0 ? c.purpleDim : "transparent", border: i === 0 ? "1px solid var(--border-bright)" : "1px solid transparent" }}>
                {tab}
              </div>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 7, height: 7, background: c.green, borderRadius: "50%", boxShadow: `0 0 8px ${c.green}`, animation: "blink 2s ease-in-out infinite" }} />
            <button
              onClick={() => { setDeployOpen(true); setDeployDone(false); setDeployRunning(false); if (deployTermRef.current) deployTermRef.current.innerHTML = ""; }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: c.purple, border: "none", borderRadius: 10, color: "white", fontFamily: c.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "-0.01em" }}
            >
              ⚡ Deploy Token
            </button>
          </div>
        </nav>

        {/* STATS BAR */}
        <div style={{ display: "flex", padding: "0 28px", borderBottom: "1px solid var(--border)", overflowX: "auto", scrollbarWidth: "none" }}>
          {statsItems.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", borderRight: "1px solid var(--border)", whiteSpace: "nowrap", flexShrink: 0, paddingLeft: i === 0 ? 0 : undefined }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  {s.isChain && <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#0052ff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>B</span>}
                  <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{s.value}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, fontFamily: c.mono, fontWeight: 700, padding: "2px 6px", borderRadius: 4, color: c.green, background: "rgba(0,229,160,0.1)" }}>{s.change}</div>
            </div>
          ))}
        </div>

        {/* TICKER */}
        {tokens.length > 0 && (
          <div style={{ overflow: "hidden", borderBottom: "1px solid var(--border)", background: "rgba(106,32,240,0.03)" }}>
            <div ref={tickerRef} style={{ display: "flex", width: "max-content", animation: "ticker-scroll 30s linear infinite" }}>
              {tickerItems.map((t, i) => (
                <div key={i} onClick={() => router.push(`/token/${t.contractAddress}`)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 24px", borderRight: "1px solid var(--border)", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <span style={{ fontFamily: c.mono, fontSize: 12, fontWeight: 700, color: c.text }}>{t.symbol}</span>
                  <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>{t.marketCap > 0 ? fmt(t.marketCap) : "—"}</span>
                  <span style={{ fontFamily: c.mono, fontSize: 11, fontWeight: 700, color: (t.priceChange24h ?? 0) >= 0 ? c.green : c.red }}>
                    {(t.priceChange24h ?? 0) >= 0 ? "+" : ""}{(t.priceChange24h ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", flex: 1 }}>

          {/* LEFT */}
          <div style={{ padding: "24px 28px", borderRight: "1px solid var(--border)" }}>

            {/* Search + Sort */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Search token or symbol…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-bright)", borderRadius: 8, padding: "8px 14px", color: c.text, fontSize: 13, outline: "none", width: 220, fontFamily: c.sans }}
                />
                <button type="submit" style={{ background: c.purpleDim, border: "1px solid var(--border-bright)", color: c.text, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: c.sans }}>Search</button>
              </form>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SORT_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => handleSort(o.value)} style={{ background: sort === o.value ? c.purpleDim : "rgba(255,255,255,0.03)", border: sort === o.value ? "1px solid var(--border-bright)" : "1px solid var(--border)", color: sort === o.value ? c.text : c.muted, borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: c.sans }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Header */}
            <div style={{ display: "flex", padding: "10px 16px", marginBottom: 4, fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)" }}>
              <span style={{ flex: "2" }}>Token</span>
              <span style={{ flex: "1", textAlign: "right" }}>Market Cap</span>
              <span style={{ flex: "1", textAlign: "right" }}>Volume</span>
              <span style={{ flex: "1", textAlign: "right" }}>24h</span>
              <span style={{ flex: "1", textAlign: "right" }}>Age</span>
            </div>

            {/* Token List */}
            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: c.muted, fontFamily: c.mono, fontSize: 13 }}>⏳ Loading...</div>
            ) : tokens.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: c.muted, fontFamily: c.mono, fontSize: 13 }}>🔍 No tokens found</div>
            ) : (
              tokens.map((token, i) => {
                const change = token.priceChange24h ?? 0;
                const isUp = change >= 0;
                return (
                  <div
                    key={token.id}
                    className={`token-row fade-in`}
                    onClick={() => router.push(`/token/${token.contractAddress}`)}
                    style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer", borderRadius: 8, transition: "background 0.15s", animationDelay: `${i * 0.04}s` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(106,32,240,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ flex: "2", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarColor(token.contractAddress), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: c.text, flexShrink: 0 }}>
                        {(token.symbol ?? "?")[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: c.text, fontSize: 14 }}>{token.name}</div>
                        <div style={{ fontSize: 11, color: c.muted, fontFamily: c.mono }}>
                          {token.symbol} <span style={{ background: c.purpleDim, border: "1px solid var(--border-bright)", color: c.purpleLight, padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 700, marginLeft: 4 }}>B</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: "1", textAlign: "right", fontSize: 13, color: c.text }}>{token.marketCap > 0 ? fmt(token.marketCap) : "—"}</div>
                    <div style={{ flex: "1", textAlign: "right", fontSize: 13, color: c.muted }}>{token.tradeVolume > 0 ? fmt(token.tradeVolume) : "—"}</div>
                    <div style={{ flex: "1", textAlign: "right", fontSize: 12, fontFamily: c.mono, fontWeight: 700, padding: "2px 0" }}>
                      <span style={{ color: isUp ? c.green : c.red, background: isUp ? "rgba(0,229,160,0.1)" : "rgba(255,68,102,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                        {isUp ? "+" : ""}{change.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ flex: "1", textAlign: "right", fontSize: 11, color: c.dim, fontFamily: c.mono }}>{timeAgo(token.deployedAt)} ago</div>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {tokens.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
                <button onClick={handlePrev} disabled={page === 1} style={{ background: c.purpleDim, border: "1px solid var(--border)", color: page === 1 ? c.dim : c.text, borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: c.sans }}>← Prev</button>
                <span style={{ padding: "8px 14px", fontSize: 13, color: c.muted, fontFamily: c.mono }}>Page {page}</span>
                <button onClick={handleNext} disabled={tokens.length < 20} style={{ background: c.purpleDim, border: "1px solid var(--border)", color: tokens.length < 20 ? c.dim : c.text, borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: tokens.length < 20 ? "not-allowed" : "pointer", fontFamily: c.sans }}>Next →</button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: "flex", flexDirection: "column" }}>

            {/* How it works */}
            <div style={{ padding: 20, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>How It Works</div>
              {[
                { num: "01", title: "Install CLI", desc: "npm install -g @dailaunch/cli" },
                { num: "02", title: "GitHub Auth", desc: "gh auth login" },
                { num: "03", title: "Deploy Token", desc: "dailaunch deploy" },
                { num: "04", title: "Earn Fees", desc: "90% of all trades → you" },
              ].map((step) => (
                <div key={step.num} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: c.mono, fontSize: 10, color: c.purpleLight, background: c.purpleDim, border: "1px solid var(--border-bright)", padding: "2px 7px", borderRadius: 4, flexShrink: 0, marginTop: 1 }}>{step.num}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{step.title}</div>
                    <div style={{ fontSize: 11, fontFamily: c.mono, color: c.muted, marginTop: 2 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setDeployOpen(true); setDeployDone(false); setDeployRunning(false); if (deployTermRef.current) deployTermRef.current.innerHTML = ""; }}
                style={{ width: "100%", marginTop: 8, padding: "10px 0", background: c.purple, border: "none", borderRadius: 10, color: "white", fontFamily: c.sans, fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: "-0.01em" }}
              >
                ⚡ Deploy Your Token
              </button>
            </div>

            {/* Mini Terminal Preview */}
            <div style={{ padding: 20, flex: 1 }}>
              <div style={{ fontSize: 11, fontFamily: c.mono, color: c.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>CLI Preview</div>
              <div style={{ background: "#060610", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                  {["#ff5f57","#febc2e","#28c840"].map((col, i) => (
                    <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />
                  ))}
                  <span style={{ fontFamily: c.mono, fontSize: 10, color: c.dim, marginLeft: 8 }}>DAILAUNCH CLI</span>
                </div>
                <div style={{ padding: "14px", fontFamily: c.mono, fontSize: 12, lineHeight: 1.7 }}>
                  <div><span style={{ color: c.purpleLight }}>$ </span><span style={{ color: "#a87fff" }}>gh auth login</span></div>
                  <div style={{ color: c.green }}>✓ Logged in as @you</div>
                  <div style={{ marginTop: 6 }}><span style={{ color: c.purpleLight }}>$ </span><span style={{ color: "#a87fff" }}>dailaunch deploy</span></div>
                  <div style={{ color: c.muted }}>? Token Name: <span style={{ color: c.green }}>MyToken</span></div>
                  <div style={{ color: c.muted }}>? Symbol: <span style={{ color: c.green }}>MTK</span></div>
                  <div style={{ color: c.green, marginTop: 4 }}>✅ Token live on Base!</div>
                  <div style={{ color: c.muted, fontSize: 11 }}>Contract: <span style={{ color: "#a87fff" }}>0xabc...def</span></div>
                  <div style={{ marginTop: 6 }}><span style={{ color: c.purpleLight }}>$ </span><span style={{ display: "inline-block", width: 2, height: 13, background: c.purpleLight, verticalAlign: "middle", animation: "blink 1s infinite" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEPLOY MODAL */}
      {deployOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setDeployOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-bright)", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.green, boxShadow: `0 0 8px ${c.green}` }} />
                <span style={{ fontFamily: c.mono, fontSize: 13, color: c.text }}>Deploy Token — DaiLaunch CLI</span>
              </div>
              <button onClick={() => setDeployOpen(false)} style={{ background: "none", border: "none", color: c.muted, fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>

            {/* Steps */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
              {[
                { label: "Install CLI", done: true },
                { label: "GitHub Auth", done: true },
                { label: "Deploy", done: deployDone },
                { label: "Live!", done: deployDone },
              ].map((step, i) => (
                <div key={i} style={{ flex: 1, padding: "10px 14px", fontSize: 12, textAlign: "center", color: step.done ? c.green : c.muted, background: step.done ? "rgba(0,229,160,0.05)" : "transparent", borderRight: i < 3 ? "1px solid var(--border)" : "none", fontFamily: c.sans, fontWeight: 500 }}>
                  {step.done ? "✅" : "○"} {step.label}
                </div>
              ))}
            </div>

            {/* Terminal */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ fontFamily: c.mono, fontSize: 12, lineHeight: 1.8, background: "#060610", borderRadius: 12, padding: 16, minHeight: 200 }}>
                <div style={{ color: "rgba(220,210,255,0.25)" }}># ── Step 1: Install DaiLaunch CLI ──────────────</div>
                <div><span style={{ color: c.purpleLight }}>$ </span><span style={{ color: "#a87fff" }}>npm install -g @dailaunch/cli</span></div>
                <div style={{ color: c.green }}>✓ dailaunch v1.0.0 installed</div>
                <br />
                <div style={{ color: "rgba(220,210,255,0.25)" }}># ── Step 2: Authenticate with GitHub ───────────</div>
                <div><span style={{ color: c.purpleLight }}>$ </span><span style={{ color: "#a87fff" }}>gh auth login</span></div>
                <div style={{ color: c.muted }}>? What account: <span style={{ color: c.green }}>GitHub.com</span></div>
                <div style={{ color: c.green }}>✓ Logged in as @youruser</div>
                <br />
                <div style={{ color: "rgba(220,210,255,0.25)" }}># ── Step 3: Deploy your token ──────────────────</div>
                <div ref={deployTermRef} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: c.dim, fontFamily: c.sans }}>Powered by <span style={{ color: c.purpleLight }}>Clanker SDK v4</span> · Base Mainnet</span>
              <button
                onClick={runDeploy}
                disabled={deployRunning || deployDone}
                style={{ padding: "9px 20px", background: deployDone ? "rgba(0,229,160,0.15)" : c.purple, border: deployDone ? "1px solid rgba(0,229,160,0.4)" : "none", borderRadius: 10, color: deployDone ? c.green : "white", fontFamily: c.sans, fontWeight: 700, fontSize: 13, cursor: deployRunning || deployDone ? "default" : "pointer", opacity: deployRunning ? 0.7 : 1 }}
              >
                {deployDone ? "🎉 Token Deployed!" : deployRunning ? "Running..." : "⚡ Run dailaunch deploy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
