"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTokens } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Token {
  id: string; contractAddress: string; name: string; symbol: string;
  deployer: string; creatorWallet: string; githubRepo: string;
  twitter?: string; website?: string; txHash: string; deployedAt: string;
  tradeVolume: number; price: number; marketCap: number;
  liquidity: number; holders: number; priceChange24h: number;
}
interface Stats { totalTokens: number; totalVolume: number; totalMarketCap: number; deployedToday: number; }
interface DeployResult { contractAddress: string; txHash: string; creatorWallet: string; githubRepo: string; baseScan: string; dexScreener: string; }
interface Props { initialStats: Stats; initialTokens: Token[]; }

type DeployStep = "form" | "confirm" | "deploying" | "done" | "error";

// ── Helpers ────────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "new", label: "⚡ Newest" }, { value: "mcap", label: "💎 Market Cap" },
  { value: "volume", label: "📊 Volume" }, { value: "gain", label: "🚀 Top Gainers" },
  { value: "holders", label: "👥 Holders" },
];
function fmt(n: number) { if (n>=1e6) return `$${(n/1e6).toFixed(1)}M`; if (n>=1e3) return `$${(n/1e3).toFixed(1)}K`; return `$${n.toFixed(2)}`; }
function timeAgo(d: string) { const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60)return`${s}s`; if(s<3600)return`${Math.floor(s/60)}m`; if(s<86400)return`${Math.floor(s/3600)}h`; return`${Math.floor(s/86400)}d`; }
function shortAddr(a: string) { return a?`${a.slice(0,6)}…${a.slice(-4)}`:""; }
function avatarBg(addr: string) { const cols=["#4c1d95","#1e3a8a","#14532d","#7c2d12","#1e3a5f","#6b21a8","#164e63","#713f12","#3b0764","#0c4a6e"]; return cols[(addr?.charCodeAt(2)??0)%cols.length]; }

// ── Style constants ────────────────────────────────────────────────────────────
const S = {
  purple:"var(--purple)", purpleL:"var(--purple-light)", purpleD:"var(--purple-dim)",
  green:"var(--green)", red:"var(--red)", text:"var(--text)", muted:"var(--text-muted)",
  dim:"var(--text-dim)", mono:"var(--mono)", sans:"var(--sans)",
  border:"1px solid var(--border)", borderB:"1px solid var(--border-bright)",
  surface:"var(--surface)", surface2:"var(--surface2)",
};

const lbl: React.CSSProperties = {
  fontSize:11, fontFamily:S.mono, color:S.dim,
  textTransform:"uppercase", letterSpacing:"0.08em",
};

// ── SidePanel Tab Component ────────────────────────────────────────────────────
function SidePanel({ tokens, S, fmt, timeAgo, avatarBg }: {
  tokens: Token[]; S: any; fmt: (n:number)=>string;
  timeAgo: (d:string)=>string; avatarBg: (a:string)=>string;
}) {
  const [activeTab, setActiveTab] = useState<"launches"|"volume">("launches");
  const topVolume = [...tokens].sort((a,b) => (b.tradeVolume??0) - (a.tradeVolume??0)).slice(0, 8);
  const recentLaunches = [...tokens].sort((a,b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()).slice(0, 8);
  const displayTokens = activeTab === "launches" ? recentLaunches : topVolume;

  return (
    <div style={{ padding:20, flex:1, overflowY:"auto" }}>
      {/* Tab buttons */}
      <div style={{ display:"flex", gap:4, marginBottom:14, background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)", borderRadius:8, padding:3 }}>
        {([
          { key:"launches" as const, label:"🕐 Recent" },
          { key:"volume"   as const, label:"📊 Volume" },
        ]).map(tab => (
          <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
            style={{ flex:1, padding:"6px 0", borderRadius:6, border:"none", cursor:"pointer", fontFamily:S.mono, fontSize:11, fontWeight:activeTab===tab.key?700:400, transition:"all .15s",
              background:activeTab===tab.key?S.purple:"transparent",
              color:activeTab===tab.key?"white":S.muted,
              boxShadow:activeTab===tab.key?"0 2px 8px rgba(106,32,240,0.4)":"none",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subtitle + live dot */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ fontSize:10, color:S.dim, fontFamily:S.mono, textTransform:"uppercase", letterSpacing:"0.08em" }}>
          {activeTab === "launches" ? "Newest Tokens" : "Highest 24h Volume"}
        </div>
        <div style={{ width:6, height:6, borderRadius:"50%", background:S.green, boxShadow:`0 0 6px ${S.green}`, animation:"blink 2s ease-in-out infinite" }} />
      </div>

      {/* List */}
      {displayTokens.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px 0" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>🚀</div>
          <div style={{ fontSize:12, color:S.muted, fontFamily:S.mono }}>No tokens yet.</div>
          <div style={{ fontSize:11, color:S.dim, fontFamily:S.mono, marginTop:4 }}>Be the first to launch!</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {displayTokens.map((token, idx) => {
            const ch = token.priceChange24h ?? 0;
            const isUp = ch >= 0;
            return (
              <a key={token.id} href={`/token/${token.contractAddress}`}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)", borderRadius:9, textDecoration:"none", transition:"all .15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.background="rgba(106,32,240,0.08)"; e.currentTarget.style.borderColor="rgba(106,32,240,0.35)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor="var(--border)"; }}
              >
                <div style={{ width:16, fontSize:10, color:S.dim, fontFamily:S.mono, textAlign:"center", flexShrink:0 }}>{idx+1}</div>
                <div style={{ width:30, height:30, borderRadius:"50%", background:avatarBg(token.contractAddress), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"white", flexShrink:0 }}>
                  {(token.symbol ?? "?")[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:S.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{token.name}</div>
                  <div style={{ fontSize:10, color:S.muted, fontFamily:S.mono, marginTop:1 }}>
                    {activeTab === "launches" ? timeAgo(token.deployedAt) + " ago" : token.symbol}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  {activeTab === "volume" ? (
                    <>
                      <div style={{ fontSize:12, fontFamily:S.mono, fontWeight:700, color:S.text }}>{token.tradeVolume > 0 ? fmt(token.tradeVolume) : "—"}</div>
                      <div style={{ fontSize:10, color:isUp?S.green:S.red, fontFamily:S.mono, marginTop:2 }}>{isUp?"+":""}{ch.toFixed(1)}%</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:11, fontFamily:S.mono, fontWeight:700, color:isUp?S.green:S.red, background:isUp?"rgba(0,229,160,0.1)":"rgba(255,68,102,0.1)", padding:"2px 6px", borderRadius:4 }}>
                        {isUp?"+":""}{ch.toFixed(1)}%
                      </div>
                      <div style={{ fontSize:10, color:S.dim, fontFamily:S.mono, marginTop:2 }}>{token.marketCap > 0 ? fmt(token.marketCap) : "—"}</div>
                    </>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardClient({ initialStats, initialTokens }: Props) {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>(initialTokens || []);
  const [stats] = useState<Stats>(initialStats || { totalTokens:0, totalVolume:0, totalMarketCap:0, deployedToday:0 });
  const [sort, setSort] = useState("new");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const { user, loading: authLoading, logout } = useAuth();

  // Deploy modal state
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployStep, setDeployStep] = useState<DeployStep>("form");
  const [form, setForm] = useState({ name:"", symbol:"", twitter:"", website:"", logoUrl:"" });
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [deployError, setDeployError] = useState("");
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const termRef = useRef<HTMLDivElement>(null);

  // CLI modal state
  const [cliModalOpen, setCliModalOpen] = useState(false);
  const [cliStep, setCliStep] = useState(2);
  const [cliRunning, setCliRunning] = useState(false);
  const [cliDone, setCliDone] = useState(false);
  const [cliLines, setCliLines] = useState<Array<{html: string}>>([]);
  const cliTermRef = useRef<HTMLDivElement>(null);

  // Token form input state (manual input dari user)
  const [tokenForm, setTokenForm] = useState({ name:"", symbol:"", twitter:"", website:"" });
  const [tokenFormError, setTokenFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  // ── User dropdown state ────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{ walletAddress:string; balance:string; balanceUsd:string; totalTokens:number; tokens:Array<{name:string;symbol:string;contractAddress:string}> } | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [pkLoading, setPkLoading] = useState(false);
  const [pkVisible, setPkVisible] = useState(false);
  const [pkError, setPkError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setPkVisible(false);
        setPrivateKey("");
        setPkError("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchWalletInfo = async () => {
    if (!user || walletInfo || walletLoading) return;
    setWalletLoading(true);
    try {
      const API = "https://api.dailaunch.online";
      const res = await fetch(`${API}/api/user/me`, {
        headers: { "x-github-token": user.githubToken },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setWalletInfo({
        walletAddress: data.walletAddress,
        balance: data.balance ?? "0.000000",
        balanceUsd: data.balanceUsd ?? "0.00",
        totalTokens: data.totalTokens ?? 0,
        tokens: data.tokens ?? [],
      });
    } catch {
      setWalletInfo({ walletAddress: "—", balance: "0.000000", balanceUsd: "0.00", totalTokens: 0, tokens: [] });
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchPrivateKey = async () => {
    if (!user || pkLoading) return;
    setPkLoading(true);
    setPkError("");
    try {
      const API = "https://api.dailaunch.online";
      const res = await fetch(`${API}/api/user/privatekey`, {
        headers: { "x-github-token": user.githubToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPrivateKey(data.privateKey);
      setPkVisible(true);
    } catch (e: any) {
      setPkError(e.message);
    } finally {
      setPkLoading(false);
    }
  };

  const handleDropdownOpen = () => {
    setDropdownOpen(v => {
      if (!v) fetchWalletInfo();
      return !v;
    });
    setPkVisible(false);
    setPrivateKey("");
    setPkError("");
  };

  // Sync cliStep with auth state when modal is open
  useEffect(() => {
    if (cliModalOpen) {
      if (user) { setCliStep(3); } else { setCliStep(2); }
    }
  }, [user, cliModalOpen]);

  // ── Token list ─────────────────────────────────────────────────────────────
  const fetchTokens = useCallback(async (p: number, s: string, q: string) => {
    setLoading(true);
    try { const d = await getTokens(p, s, q); setTokens(d.tokens || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const handleSort = (s: string) => { setSort(s); setPage(1); fetchTokens(1, s, search); };

  // ── Deploy modal ───────────────────────────────────────────────────────────
  const openDeploy = () => {
    setCliModalOpen(true);
    setCliStep(user ? 3 : 2);
    setCliRunning(false);
    setCliDone(false);
    setCliLines([]);
    setTokenForm({ name:"", symbol:"", twitter:"", website:"" });
    setTokenFormError("");
    setShowForm(true);
    setLogoUrl("");
  };

  const cliSleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const addCliLine = (html: string) => {
    setCliLines(prev => [...prev, { html }]);
    setTimeout(() => { if (cliTermRef.current) cliTermRef.current.scrollTop = 99999; }, 30);
  };

  const runCliDeploy = async () => {
    if (cliRunning || !user) return;

    // Validasi form
    if (!tokenForm.name.trim()) { setTokenFormError("Token name wajib diisi"); return; }
    if (!tokenForm.symbol.trim()) { setTokenFormError("Symbol wajib diisi"); return; }
    if (tokenForm.symbol.trim().length > 10) { setTokenFormError("Symbol maksimal 10 karakter"); return; }
    setTokenFormError("");
    setShowForm(false); // sembunyikan form, tampilkan terminal
    setCliRunning(true);

    const clr = { purple:"#a87fff", green:"#00e5a0", yellow:"#f59e0b", muted:"#64748b" };

    const appendLines = async (lines: string[], delay = 120) => {
      for (const l of lines) {
        await cliSleep(delay);
        addCliLine(l);
        setTimeout(() => { if (cliTermRef.current) cliTermRef.current.scrollTop = 99999; }, 40);
      }
    };

    setCliStep(3);

    // Tampilkan data yang diisi user di terminal
    await appendLines([
      `<div style="color:${clr.muted}">? Token Name: <span style="color:${clr.green}">${tokenForm.name}</span></div>`,
    ], 300);
    await appendLines([
      `<div style="color:${clr.muted}">? Symbol (max 10 chars): <span style="color:${clr.green}">${tokenForm.symbol.toUpperCase()}</span></div>`,
    ], 300);
    if (logoUrl) {
      await appendLines([
        `<div style="color:${clr.muted}">? Logo URL: <span style="color:${clr.green}">${logoUrl}</span></div>`,
      ], 200);
    }
    if (tokenForm.twitter) {
      await appendLines([
        `<div style="color:${clr.muted}">? Twitter/X URL: <span style="color:${clr.green}">${tokenForm.twitter}</span></div>`,
      ], 200);
    }
    if (tokenForm.website) {
      await appendLines([
        `<div style="color:${clr.muted}">? Website URL: <span style="color:${clr.green}">${tokenForm.website}</span></div>`,
      ], 200);
    }

    await cliSleep(400);
    await appendLines([
      `<div>&nbsp;</div>`,
      `<div style="color:${clr.yellow}">⏳ Connecting to Base Mainnet...</div>`,
    ], 100);
    await cliSleep(900);
    await appendLines([
      `<div style="color:${clr.yellow}">⏳ Generating creator wallet (AES-256)...</div>`,
    ], 100);
    await cliSleep(800);
    await appendLines([
      `<div style="color:${clr.yellow}">⏳ Deploying via Clanker SDK v4... (1-2 min)</div>`,
    ], 100);

    try {
      const API = "https://api.dailaunch.online";
      const res = await fetch(`${API}/api/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-token": user.githubToken,
        },
        body: JSON.stringify({
          name: tokenForm.name.trim(),
          symbol: tokenForm.symbol.trim().toUpperCase(),
          twitter: tokenForm.twitter.trim() || undefined,
          website: tokenForm.website.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");

      setCliStep(4);

      await appendLines([
        `<div>&nbsp;</div>`,
        `<div style="color:${clr.green};font-weight:700">✅ Deployment Complete!</div>`,
        `<div>&nbsp;</div>`,
        `<div style="color:${clr.muted}">  Contract : <span style="color:${clr.purple}">${data.contractAddress}</span></div>`,
        `<div style="color:${clr.muted}">  Wallet   : <span style="color:${clr.purple}">${data.creatorWallet}</span></div>`,
        `<div style="color:${clr.muted}">  GitHub   : <span style="color:${clr.purple}">${data.githubRepo}</span></div>`,
        `<div style="color:${clr.muted}">  TX       : <span style="color:${clr.purple}">${data.txHash}</span></div>`,
        `<div>&nbsp;</div>`,
        `<div style="color:${clr.green}">  💰 Fee Split (per swap):</div>`,
        `<div style="color:${clr.muted}">  70% ──→ <span style="color:${clr.green}">Your Creator Wallet</span></div>`,
        `<div style="color:${clr.muted}">  10% ──→ <span style="color:${clr.purple}">DaiLaunch Platform</span></div>`,
        `<div style="color:${clr.muted}">  20% ──→ <span style="color:#64748b">Clanker Protocol</span></div>`,
        `<div>&nbsp;</div>`,
        `<div style="color:${clr.purple}">$ <span style="display:inline-block;width:8px;height:13px;background:${clr.purple};vertical-align:middle;animation:blink 1s infinite"></span></div>`,
      ], 80);

      setCliDone(true);
      setTimeout(() => fetchTokens(1, sort, search), 2500);

    } catch (err: any) {
      setCliStep(3);
      await appendLines([
        `<div>&nbsp;</div>`,
        `<div style="color:#ff4466">❌ Error: ${err.message}</div>`,
        `<div style="color:${clr.muted}">  Coba lagi atau hubungi support.</div>`,
      ], 80);
      setCliRunning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const tickerItems = [...tokens, ...tokens];

  return (
    <>
      {/* Background */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:"radial-gradient(ellipse 60% 40% at 10% 20%,rgba(106,32,240,.12) 0%,transparent 60%),radial-gradient(ellipse 40% 50% at 90% 80%,rgba(80,20,200,.08) 0%,transparent 60%)" }} />
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:"linear-gradient(rgba(100,50,220,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(100,50,220,.04) 1px,transparent 1px)",
        backgroundSize:"48px 48px" }} />

      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", minHeight:"100vh" }}>

        {/* ── NAV ── */}
        <nav style={{ display:"flex", alignItems:"center", padding:"0 28px", height:60, borderBottom:S.border, background:"rgba(8,8,15,.85)", backdropFilter:"blur(20px)", position:"sticky", top:0, zIndex:100, gap:24 }}>
          <a href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
           <img src="/logo.png" alt="DaiLaunch" style={{ width:32, height:32, borderRadius:"50%" }} />
<span style={{ fontWeight:700, fontSize:16, color:S.text, letterSpacing:"-0.01em" }}>DaiLaunch</span>
          </a>
          <div style={{ display:"flex", gap:4 }}>
            {([
              { label:"Dashboard", href:"/" },
              { label:"Tokens", href:"/tokens" },
              { label:"Docs",      href:"https://github.com/dailaunch-bot/dailaunch-", target:"_blank" },
            ] as Array<{ label:string; href:string; target?:string }>).map((tab, i)=>(
              <a key={tab.label} href={tab.href} target={tab.target}
                style={{ padding:"6px 14px", borderRadius:8, fontSize:13, fontWeight:500,
                  color:i===0?S.text:S.muted, cursor:"pointer", textDecoration:"none",
                  background:i===0?S.purpleD:"transparent",
                  border:i===0?S.borderB:"1px solid transparent",
                  display:"inline-block" }}>
                {tab.label}
              </a>
            ))}

          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:7, height:7, background:S.green, borderRadius:"50%", boxShadow:`0 0 8px ${S.green}`, animation:"blink 2s ease-in-out infinite" }} />
            {user ? (
              <div ref={dropdownRef} style={{ position:"relative" }}>
                {/* Trigger button */}
                <button
                  onClick={handleDropdownOpen}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px 5px 6px", background:S.purpleD, border:dropdownOpen?S.borderB:S.border, borderRadius:9, cursor:"pointer", transition:"all .15s" }}
                >
                  {user.githubAvatar && <img src={user.githubAvatar} alt="" style={{ width:24, height:24, borderRadius:"50%", objectFit:"cover" }} />}
                  <span style={{ fontSize:12, color:S.text, fontFamily:S.mono }}>@{user.githubLogin}</span>
                  <span style={{ fontSize:9, color:S.muted, marginLeft:2, transition:"transform .2s", display:"inline-block", transform:dropdownOpen?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
                </button>

                {/* Dropdown panel */}
                {dropdownOpen && (
                  <div style={{
                    position:"absolute", top:"calc(100% + 8px)", right:0, width:300,
                    background:"#0e0e1f", border:"1px solid rgba(106,32,240,0.3)",
                    borderRadius:12, boxShadow:"0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(106,32,240,0.1)",
                    zIndex:999, overflow:"hidden",
                    animation:"dropIn .15s cubic-bezier(0.16,1,0.3,1)"
                  }}>
                    {/* Header */}
                    <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
                      {user.githubAvatar && <img src={user.githubAvatar} alt="" style={{ width:36, height:36, borderRadius:"50%", border:"2px solid rgba(106,32,240,0.4)" }} />}
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:S.text, fontFamily:S.mono }}>@{user.githubLogin}</div>
                        <div style={{ fontSize:10, color:S.muted, marginTop:2 }}>Base Mainnet · Creator</div>
                      </div>
                    </div>

                    {/* Fee / Wallet Info */}
                    <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize:10, color:S.dim, fontFamily:S.mono, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>💰 Creator Fee Wallet</div>
                      {walletLoading ? (
                        <div style={{ fontSize:12, color:S.muted, fontFamily:S.mono }}>⏳ Loading wallet info...</div>
                      ) : walletInfo ? (
                        <>
                          {/* Balance */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                            <div>
                              <div style={{ fontSize:18, fontWeight:700, color:S.green, fontFamily:S.mono }}>{walletInfo.balance} ETH</div>
                              <div style={{ fontSize:11, color:S.muted, marginTop:1 }}>≈ ${walletInfo.balanceUsd} USD</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:12, color:S.purpleL, fontFamily:S.mono }}>{walletInfo.totalTokens}</div>
                              <div style={{ fontSize:10, color:S.muted }}>tokens deployed</div>
                            </div>
                          </div>
                          {/* Wallet address */}
                          <div style={{ fontSize:10, color:S.muted, fontFamily:S.mono, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6, padding:"6px 8px", wordBreak:"break-all", marginBottom:6 }}>
                            {walletInfo.walletAddress !== "—" ? walletInfo.walletAddress : "Deploy a token first"}
                          </div>
                          {walletInfo.walletAddress !== "—" && (
                            <a href={`https://basescan.org/address/${walletInfo.walletAddress}`} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:10, color:S.purpleL, fontFamily:S.mono, textDecoration:"none" }}>
                              🔍 View on BaseScan ↗
                            </a>
                          )}
                          <div style={{ fontSize:10, color:S.dim, marginTop:6, fontFamily:S.mono }}>70% of all trades → this wallet</div>
                        </>
                      ) : (
                        <div style={{ fontSize:12, color:S.muted, fontFamily:S.mono }}>Deploy a token to generate your wallet</div>
                      )}
                    </div>

                    {/* Export Private Key */}
                    <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize:10, color:S.dim, fontFamily:S.mono, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>🔑 Export Private Key</div>
                      {!pkVisible ? (
                        <>
                          <div style={{ fontSize:11, color:S.muted, marginBottom:8, lineHeight:1.5 }}>Import your creator wallet to MetaMask to withdraw fees anytime.</div>
                          <button onClick={fetchPrivateKey} disabled={pkLoading}
                            style={{ width:"100%", padding:"8px", background:"rgba(255,68,102,0.08)", border:"1px solid rgba(255,68,102,0.25)", borderRadius:7, color:"#ff4466", fontFamily:S.mono, fontSize:12, cursor:pkLoading?"not-allowed":"pointer", transition:"all .15s" }}
                            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,68,102,0.15)")}
                            onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,68,102,0.08)")}>
                            {pkLoading ? "⏳ Fetching..." : "⚠️ Reveal Private Key"}
                          </button>
                          {pkError && <div style={{ fontSize:11, color:"#ff4466", marginTop:6, fontFamily:S.mono }}>❌ {pkError}</div>}
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize:11, color:"#ff4466", fontWeight:600, marginBottom:6 }}>⚠️ NEVER share this key with anyone!</div>
                          <div style={{ fontSize:10, color:S.green, fontFamily:S.mono, background:"rgba(0,229,160,0.05)", border:"1px solid rgba(0,229,160,0.15)", borderRadius:6, padding:"8px", wordBreak:"break-all", marginBottom:8, userSelect:"all" }}>
                            {privateKey}
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={()=>navigator.clipboard.writeText(privateKey)}
                              style={{ flex:1, padding:"6px", background:"rgba(0,229,160,0.08)", border:"1px solid rgba(0,229,160,0.2)", borderRadius:6, color:S.green, fontFamily:S.mono, fontSize:11, cursor:"pointer" }}>
                              📋 Copy
                            </button>
                            <button onClick={()=>{ setPkVisible(false); setPrivateKey(""); }}
                              style={{ flex:1, padding:"6px", background:"rgba(255,255,255,0.04)", border:S.border, borderRadius:6, color:S.muted, fontFamily:S.mono, fontSize:11, cursor:"pointer" }}>
                              🙈 Hide
                            </button>
                          </div>
                          <div style={{ fontSize:10, color:S.dim, marginTop:8, lineHeight:1.5 }}>
                            Import to MetaMask: Account icon → Import Account → Paste key → Switch to Base Mainnet
                          </div>
                        </>
                      )}
                    </div>

                    {/* Logout */}
                    <div style={{ padding:"8px 10px" }}>
                      <button onClick={()=>{ setDropdownOpen(false); logout(); }}
                        style={{ width:"100%", padding:"8px", background:"transparent", border:"none", borderRadius:7, color:S.muted, fontFamily:S.sans, fontSize:12, cursor:"pointer", textAlign:"left", transition:"all .15s" }}
                        onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color=S.text; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=S.muted; }}>
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={openDeploy} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", background:S.purple, border:"none", borderRadius:10, color:"white", fontFamily:S.sans, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  ⚡ Deploy Token
                </button>
              </>
            )}
          </div>
        </nav>

        {/* ── STATS BAR ── */}
        <div style={{ display:"flex", padding:"0 28px", borderBottom:S.border, overflowX:"auto", scrollbarWidth:"none" }}>
          {[
            { label:"TOTAL TOKENS", value:stats.totalTokens?.toLocaleString()??"0", change:`+${stats.deployedToday??0} today` },
            { label:"TOTAL VOLUME", value:fmt(stats.totalVolume??0), change:"↑ live" },
            { label:"MARKET CAP", value:fmt(stats.totalMarketCap??0), change:"↑ live" },
            { label:"DEPLOYED TODAY", value:String(stats.deployedToday??0), change:"🚀 live" },
            { label:"CHAIN", value:"Base", change:"Mainnet", isChain:true },
          ].map((s,i)=>(
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 24px", borderRight:S.border, whiteSpace:"nowrap", flexShrink:0, paddingLeft:i===0?0:undefined }}>
              <div>
                <div style={{ fontSize:11, fontFamily:S.mono, color:S.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                  {s.isChain && <span style={{ width:16, height:16, borderRadius:"50%", background:"#0052ff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"white" }}>B</span>}
                  <span style={{ fontSize:14, fontWeight:600, color:S.text }}>{s.value}</span>
                </div>
              </div>
              <div style={{ fontSize:11, fontFamily:S.mono, fontWeight:700, padding:"2px 6px", borderRadius:4, color:S.green, background:"rgba(0,229,160,0.1)" }}>{s.change}</div>
            </div>
          ))}
        </div>

        {/* ── TICKER ──
            FIX: Wrapper pakai className "ticker-wrapper" agar CSS bisa pause animasi saat hover.
                 Setiap item pakai <a> tag bukan onClick agar klik selalu reliable. */}
        {tokens.length > 0 && (
          <div className="ticker-wrapper" style={{ overflow:"hidden", borderBottom:S.border, background:"rgba(106,32,240,.03)" }}>
            <div style={{ display:"flex", width:"max-content", animation:"ticker-scroll 30s linear infinite" }}>
              {tickerItems.map((t,i)=>(
                // ✅ FIX: Pakai <a href> bukan onClick + router.push agar klik tidak gagal saat animasi berjalan
                <a
                  key={i}
                  href={`/token/${t.contractAddress}`}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 24px", borderRight:S.border, cursor:"pointer", whiteSpace:"nowrap", textDecoration:"none" }}
                >
                  <span style={{ fontFamily:S.mono, fontSize:12, fontWeight:700, color:S.text }}>{t.symbol}</span>
                  <span style={{ fontFamily:S.mono, fontSize:11, color:S.muted }}>{t.marketCap>0?fmt(t.marketCap):"—"}</span>
                  <span style={{ fontFamily:S.mono, fontSize:11, fontWeight:700, color:(t.priceChange24h??0)>=0?S.green:S.red }}>
                    {(t.priceChange24h??0)>=0?"+":""}{(t.priceChange24h??0).toFixed(1)}%
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── MAIN ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", flex:1 }}>

          {/* LEFT */}
          <div id="tokens" style={{ padding:"24px 28px", borderRight:S.border }}>
            {/* Search + Sort */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <form onSubmit={(e)=>{ e.preventDefault(); setSearch(searchInput); setPage(1); fetchTokens(1,sort,searchInput); }} style={{ display:"flex", gap:8 }}>
                <input type="text" placeholder="Search token or symbol…" value={searchInput} onChange={e=>setSearchInput(e.target.value)}
                  style={{ background:"rgba(255,255,255,.04)", border:S.borderB, borderRadius:8, padding:"8px 14px", color:S.text, fontSize:13, outline:"none", width:220, fontFamily:S.sans }} />
                <button type="submit" style={{ background:S.purpleD, border:S.borderB, color:S.text, borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer", fontFamily:S.sans }}>Search</button>
              </form>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {SORT_OPTIONS.map(o=>(
                  <button key={o.value} onClick={()=>handleSort(o.value)}
                    style={{ background:sort===o.value?S.purpleD:"rgba(255,255,255,.03)", border:sort===o.value?S.borderB:S.border, color:sort===o.value?S.text:S.muted, borderRadius:20, padding:"5px 12px", fontSize:12, cursor:"pointer", fontFamily:S.sans }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table header */}
            <div style={{ display:"flex", padding:"10px 16px", marginBottom:4, fontSize:11, fontFamily:S.mono, color:S.dim, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:S.border }}>
              <span style={{ flex:"2" }}>Token</span>
              <span style={{ flex:"1", textAlign:"right" }}>Market Cap</span>
              <span style={{ flex:"1", textAlign:"right" }}>Volume</span>
              <span style={{ flex:"1", textAlign:"right" }}>24h</span>
              <span style={{ flex:"1", textAlign:"right" }}>Age</span>
            </div>

            {loading ? (
              <div style={{ padding:60, textAlign:"center", color:S.muted, fontFamily:S.mono, fontSize:13 }}>⏳ Loading...</div>
            ) : tokens.length === 0 ? (
              <div style={{ padding:60, textAlign:"center", color:S.muted, fontFamily:S.mono, fontSize:13 }}>🔍 No tokens found</div>
            ) : tokens.map((token,i)=>{
              const ch = token.priceChange24h??0; const isUp = ch>=0;
              return (
                // ✅ FIX UTAMA: Pakai <a href> bukan <div onClick + router.push>
                // Ini yang menyebabkan token detail tidak bisa diklik.
                // <a> tag adalah native HTML sehingga klik selalu berfungsi,
                // termasuk klik kanan → "Open in new tab".
                <a
                  key={token.id}
                  href={`/token/${token.contractAddress}`}
                  className="token-row fade-in"
                  style={{
                    display:"flex", alignItems:"center", width:"100%",
                    padding:"12px 16px", borderBottom:S.border, borderRadius:8,
                    transition:"background .15s", animationDelay:`${i*.04}s`,
                    textDecoration:"none",
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(106,32,240,.06)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                >
                  <div style={{ flex:"2", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:avatarBg(token.contractAddress), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:S.text, flexShrink:0 }}>
                      {(token.symbol??"?")[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, color:S.text, fontSize:14 }}>{token.name}</div>
                      <div style={{ fontSize:11, color:S.muted, fontFamily:S.mono }}>
                        {token.symbol} <span style={{ background:S.purpleD, border:S.borderB, color:S.purpleL, padding:"1px 5px", borderRadius:4, fontSize:9, fontWeight:700, marginLeft:4 }}>B</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex:"1", textAlign:"right", fontSize:13, color:S.text }}>{token.marketCap>0?fmt(token.marketCap):"—"}</div>
                  <div style={{ flex:"1", textAlign:"right", fontSize:13, color:S.muted }}>{token.tradeVolume>0?fmt(token.tradeVolume):"—"}</div>
                  <div style={{ flex:"1", textAlign:"right" }}>
                    <span style={{ fontSize:12, fontFamily:S.mono, fontWeight:700, color:isUp?S.green:S.red, background:isUp?"rgba(0,229,160,.1)":"rgba(255,68,102,.1)", padding:"2px 6px", borderRadius:4 }}>
                      {isUp?"+":""}{ch.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ flex:"1", textAlign:"right", fontSize:11, color:S.dim, fontFamily:S.mono }}>{timeAgo(token.deployedAt)} ago</div>
                </a>
              );
            })}

            {tokens.length > 0 && (
              <div style={{ display:"flex", justifyContent:"center", gap:12, marginTop:24 }}>
                <button onClick={()=>{ const p=Math.max(1,page-1); setPage(p); fetchTokens(p,sort,search); }} disabled={page===1}
                  style={{ background:S.purpleD, border:S.border, color:page===1?S.dim:S.text, borderRadius:8, padding:"8px 18px", fontSize:13, cursor:page===1?"not-allowed":"pointer", fontFamily:S.sans }}>← Prev</button>
                <span style={{ padding:"8px 14px", fontSize:13, color:S.muted, fontFamily:S.mono }}>Page {page}</span>
                <button onClick={()=>{ const p=page+1; setPage(p); fetchTokens(p,sort,search); }} disabled={tokens.length<20}
                  style={{ background:S.purpleD, border:S.border, color:tokens.length<20?S.dim:S.text, borderRadius:8, padding:"8px 18px", fontSize:13, cursor:tokens.length<20?"not-allowed":"pointer", fontFamily:S.sans }}>Next →</button>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display:"flex", flexDirection:"column" }}>
            <div style={{ padding:20, borderBottom:S.border }}>
              <div style={{ fontSize:11, fontFamily:S.mono, color:S.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>How It Works</div>
              {[
                { num:"01", title:"Install CLI", desc:"npm install -g @dailaunch/cli" },
                { num:"02", title:"GitHub Auth", desc:"gh auth login" },
                { num:"03", title:"Deploy Token", desc:"dailaunch deploy" },
                { num:"04", title:"Earn Fees", desc:"70% of all trades → you" },
              ].map(step=>(
                <div key={step.num} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ fontFamily:S.mono, fontSize:10, color:S.purpleL, background:S.purpleD, border:S.borderB, padding:"2px 7px", borderRadius:4, flexShrink:0, marginTop:1 }}>{step.num}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:S.text }}>{step.title}</div>
                    <div style={{ fontSize:11, fontFamily:S.mono, color:S.muted, marginTop:2 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
              <button onClick={openDeploy} style={{ width:"100%", marginTop:8, padding:"10px 0", background:S.purple, border:"none", borderRadius:10, color:"white", fontFamily:S.sans, fontWeight:700, fontSize:14, cursor:"pointer" }}>
                ⚡ Deploy Token
              </button>
            </div>

            <SidePanel tokens={tokens} S={S} fmt={fmt} timeAgo={timeAgo} avatarBg={avatarBg} />
          </div>
        </div>
      </div>

      {/* ── CLI DEPLOY MODAL ──────────────────────────────────────────────────── */}
      {cliModalOpen && (
        <div onClick={e=>{ if(e.target===e.currentTarget && !cliRunning) setCliModalOpen(false); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#0d0d1a", border:"1px solid rgba(106,32,240,.4)", borderRadius:16, width:"100%", maxWidth:580, display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(0,0,0,.7)", overflow:"hidden" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:S.green, boxShadow:`0 0 8px ${S.green}` }} />
                <span style={{ fontFamily:S.mono, fontSize:13, color:S.text, fontWeight:600 }}>Deploy Token — DaiLaunch CLI</span>
              </div>
              {!cliRunning && (
                <button onClick={()=>setCliModalOpen(false)} style={{ background:"none", border:"none", color:S.muted, fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
              )}
            </div>

            {/* Step tabs */}
            <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
              {[
                { n:1, icon:"✅", label:"Install CLI" },
                { n:2, icon:"🔐", label:"GitHub Auth" },
                { n:3, icon:"⚡", label:"Deploy" },
                { n:4, icon:"🎉", label:"Live!" },
              ].map((s, i) => {
                const done = s.n < cliStep;
                const active = s.n === cliStep;
                return (
                  <div key={s.n} style={{ flex:1, padding:"10px 8px", textAlign:"center", fontSize:12, fontFamily:S.sans, fontWeight:active?700:400,
                    color:done?S.green:active?S.text:S.dim,
                    background:active?"rgba(106,32,240,.15)":"transparent",
                    borderRight:i<3?"1px solid rgba(255,255,255,.06)":"none",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:16 }}>{done?"✅":s.icon}</span>
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Terminal */}
            <div ref={cliTermRef} style={{ background:"#06060f", padding:"16px 18px", fontFamily:S.mono, fontSize:12, lineHeight:1.9, maxHeight:360, overflowY:"auto", minHeight:200 }}>

              <div style={{ color:"#3d3d5c" }}># ── Step 1: Install DaiLaunch CLI ─────────────────</div>
              <div><span style={{ color:S.purpleL }}>$ </span><span style={{ color:"#a87fff" }}>git clone https://github.com/dailaunch-bot/dailaunch-</span></div>
              <div><span style={{ color:S.purpleL }}>$ </span><span style={{ color:"#a87fff" }}>cd dailaunch- &amp;&amp; npm install &amp;&amp; npm run build:all</span></div>
              <div><span style={{ color:S.purpleL }}>$ </span><span style={{ color:"#a87fff" }}>npm install -g ./packages/cli</span></div>
              <div style={{ color:S.green }}>✓ dailaunch v1.0.0 installed</div>
              <div>&nbsp;</div>

              <div style={{ color:"#3d3d5c" }}># ── Step 2: Authenticate with GitHub ───────────────</div>
              <div><span style={{ color:S.purpleL }}>$ </span><span style={{ color:"#a87fff" }}>gh auth login</span></div>

              {user ? (
                <>
                  <div style={{ color:S.muted }}>? What account do you want to log into? <span style={{ color:S.green }}>GitHub.com</span></div>
                  <div style={{ color:S.muted }}>? How would you like to authenticate? <span style={{ color:S.green }}>Login with a web browser</span></div>
                  <div style={{ color:S.green }}>✓ Logged in as @{user.githubLogin}</div>
                  <div>&nbsp;</div>

                  <div style={{ color:"#3d3d5c" }}># ── Step 3: Deploy your token ──────────────────────</div>
                  <div><span style={{ color:S.purpleL }}>$ </span><span style={{ color:"#a87fff" }}>dailaunch deploy</span></div>

                  {/* ── FORM INPUT MANUAL ── */}
                  {showForm && !cliRunning && !cliDone && (
                    <div style={{ marginTop:14, padding:"14px 16px", background:"rgba(106,32,240,0.08)", border:"1px solid rgba(106,32,240,0.25)", borderRadius:10 }}>
                      {/* Token Name */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, color:S.dim, fontFamily:S.mono, marginBottom:4 }}>
                          <span style={{ color:S.purpleL }}>?</span> Token Name <span style={{ color:S.red }}>*</span>
                        </div>
                        <input
                          type="text"
                          placeholder="My Awesome Token"
                          value={tokenForm.name}
                          onChange={e => setTokenForm(f => ({ ...f, name: e.target.value }))}
                          style={{ width:"100%", padding:"8px 12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(120,60,255,0.3)", borderRadius:7, color:S.text, fontSize:13, outline:"none", fontFamily:S.mono }}
                        />
                      </div>
                      {/* Symbol */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, color:S.dim, fontFamily:S.mono, marginBottom:4 }}>
                          <span style={{ color:S.purpleL }}>?</span> Symbol <span style={{ color:S.muted, fontSize:10 }}>(max 10 chars)</span> <span style={{ color:S.red }}>*</span>
                        </div>
                        <input
                          type="text"
                          placeholder="MAT"
                          maxLength={10}
                          value={tokenForm.symbol}
                          onChange={e => setTokenForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                          style={{ width:"100%", padding:"8px 12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(120,60,255,0.3)", borderRadius:7, color:S.green, fontSize:13, outline:"none", fontFamily:S.mono, letterSpacing:"0.05em" }}
                        />
                      </div>
                      {/* Twitter */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, color:S.dim, fontFamily:S.mono, marginBottom:4 }}>
                          <span style={{ color:S.purpleL }}>?</span> Twitter/X URL <span style={{ color:S.muted, fontSize:10 }}>(optional)</span>
                        </div>
                        <input
                          type="text"
                          placeholder="https://x.com/yourtoken"
                          value={tokenForm.twitter}
                          onChange={e => setTokenForm(f => ({ ...f, twitter: e.target.value }))}
                          style={{ width:"100%", padding:"8px 12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(120,60,255,0.2)", borderRadius:7, color:S.text, fontSize:13, outline:"none", fontFamily:S.mono }}
                        />
                      </div>
                      {/* Website */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, color:S.dim, fontFamily:S.mono, marginBottom:4 }}>
                          <span style={{ color:S.purpleL }}>?</span> Website URL <span style={{ color:S.muted, fontSize:10 }}>(optional)</span>
                        </div>
                        <input
                          type="text"
                          placeholder="https://yourtoken.xyz"
                          value={tokenForm.website}
                          onChange={e => setTokenForm(f => ({ ...f, website: e.target.value }))}
                          style={{ width:"100%", padding:"8px 12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(120,60,255,0.2)", borderRadius:7, color:S.text, fontSize:13, outline:"none", fontFamily:S.mono }}
                        />
                      </div>
                      {/* Logo URL */}
                      <div style={{ marginBottom:tokenFormError ? 10 : 0 }}>
                        <div style={{ fontSize:11, color:S.dim, fontFamily:S.mono, marginBottom:4 }}>
                          <span style={{ color:S.purpleL }}>?</span> Logo URL <span style={{ color:S.muted, fontSize:10 }}>(optional)</span>
                        </div>
                        <input
                          type="text"
                          placeholder="https://yourtoken.xyz/logo.png"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          style={{ width:"100%", padding:"8px 12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(120,60,255,0.2)", borderRadius:7, color:S.text, fontSize:13, outline:"none", fontFamily:S.mono }}
                        />
                        {logoUrl && (
                          <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
                            <img
                              src={logoUrl}
                              alt="logo preview"
                              onError={e => (e.currentTarget.style.display = "none")}
                              onLoad={e => (e.currentTarget.style.display = "block")}
                              style={{ display:"none", width:32, height:32, borderRadius:6, objectFit:"cover", border:"1px solid rgba(168,127,255,0.4)" }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Error */}
                      {tokenFormError && (
                        <div style={{ fontSize:12, color:S.red, fontFamily:S.mono, marginTop:8 }}>❌ {tokenFormError}</div>
                      )}
                    </div>
                  )}

                  {/* Dynamic terminal lines saat deploy berjalan */}
                  {cliLines.map((l, i) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: l.html }} />
                  ))}

                  {!cliRunning && !cliDone && !showForm && (
                    <div>
                      <span style={{ display:"inline-block", width:8, height:13, background:S.purpleL, verticalAlign:"middle", animation:"blink 1s infinite" }} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ color:S.muted }}>? What account do you want to log into? <span style={{ color:S.green }}>GitHub.com</span></div>
                  <div style={{ color:S.muted }}>? How would you like to authenticate? <span style={{ color:S.green }}>Login with a web browser</span></div>
                  <div style={{ color:"#f59e0b" }}>⏳ Waiting for GitHub authentication...</div>
                  <div>&nbsp;</div>
                  <div style={{ color:"#3d3d5c" }}># Click the button below to authenticate ↓</div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderTop:"1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize:11, color:S.dim, fontFamily:S.sans }}>
                Powered by <span style={{ color:S.purpleL }}>Clanker SDK v4</span> · Base Mainnet
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {cliDone ? (
                  <button onClick={()=>{ setCliModalOpen(false); fetchTokens(1, sort, search); }}
                    style={{ padding:"9px 20px", background:"rgba(0,229,160,.15)", border:"1px solid rgba(0,229,160,.35)", borderRadius:10, color:S.green, fontFamily:S.sans, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    🎉 Token Deployed!
                  </button>
                ) : !user ? (
                  <a href="https://api.dailaunch.online/auth/github"
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 20px", background:"#24292e", border:"1px solid rgba(255,255,255,.15)", borderRadius:10, color:"white", fontFamily:S.sans, fontSize:13, fontWeight:700, textDecoration:"none", cursor:"pointer" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    Login with GitHub
                  </a>
                ) : (
                  <button onClick={runCliDeploy} disabled={cliRunning}
                    style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 20px", background:cliRunning?"rgba(106,32,240,.3)":S.purple, border:"none", borderRadius:10, color:"white", fontFamily:S.sans, fontSize:13, fontWeight:700, cursor:cliRunning?"not-allowed":"pointer", opacity:cliRunning?.7:1 }}>
                    {cliRunning ? "⏳ Deploying..." : showForm ? "⚡ Deploy Token" : "⚡ Run dailaunch deploy"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
