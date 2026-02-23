"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTokens, deployToken, verifyJWT, getGitHubLoginUrl } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Token {
  id: string; contractAddress: string; name: string; symbol: string;
  deployer: string; creatorWallet: string; githubRepo: string;
  twitter?: string; website?: string; txHash: string; deployedAt: string;
  tradeVolume: number; price: number; marketCap: number;
  liquidity: number; holders: number; priceChange24h: number;
}
interface Stats { totalTokens: number; totalVolume: number; totalMarketCap: number; deployedToday: number; }
interface GHUser { login: string; avatar: string; name: string; githubToken: string; }
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

const input: React.CSSProperties = {
  width:"100%", padding:"10px 14px", background:"rgba(255,255,255,0.04)",
  border:"1px solid var(--border-bright)", borderRadius:8, color:S.text,
  fontSize:13, outline:"none", fontFamily:S.sans, marginTop:6,
};
const lbl: React.CSSProperties = {
  fontSize:11, fontFamily:S.mono, color:S.dim,
  textTransform:"uppercase", letterSpacing:"0.08em",
};

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

  // Auth state
  const [ghUser, setGhUser] = useState<GHUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Deploy modal state
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployStep, setDeployStep] = useState<DeployStep>("form");
  const [form, setForm] = useState({ name:"", symbol:"", twitter:"", website:"", logoUrl:"" });
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [deployError, setDeployError] = useState("");
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const termRef = useRef<HTMLDivElement>(null);

  // ── Auth: cek JWT dari URL (?auth=...) atau localStorage ──────────────────
  useEffect(() => {
    async function checkAuth() {
      setAuthLoading(true);
      try {
        // Cek URL param dulu (setelah OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get("auth");

        if (authToken) {
          // Simpan ke localStorage, bersihkan URL
          localStorage.setItem("dl_jwt", authToken);
          window.history.replaceState({}, "", window.location.pathname);
          const user = await verifyJWT(authToken);
          if (user) { setGhUser(user); setAuthLoading(false); return; }
        }

        // Cek localStorage
        const saved = localStorage.getItem("dl_jwt");
        if (saved) {
          const user = await verifyJWT(saved);
          if (user) { setGhUser(user); }
          else { localStorage.removeItem("dl_jwt"); }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem("dl_jwt");
    setGhUser(null);
  };

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
    if (!ghUser) { window.location.href = getGitHubLoginUrl(); return; }
    setDeployOpen(true);
    setDeployStep("form");
    setForm({ name:"", symbol:"", twitter:"", website:"", logoUrl:"" });
    setDeployResult(null);
    setDeployError("");
    setDeployLog([]);
  };

  const addLog = (msg: string) => {
    setDeployLog(p => [...p, msg]);
    setTimeout(() => { if (termRef.current) termRef.current.scrollTop = 99999; }, 50);
  };

  const runDeploy = async () => {
    if (!ghUser) return;
    setDeployStep("deploying");
    setDeployLog([]);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const line of [
      `$ dailaunch deploy`,
      `✓ GitHub: @${ghUser.login}`,
      `? Token Name: ${form.name}`,
      `? Symbol: ${form.symbol.toUpperCase()}`,
      form.twitter ? `? Twitter: ${form.twitter}` : null,
      form.website ? `? Website: ${form.website}` : null,
      ``,
      `⏳ Connecting to Base Mainnet...`,
    ].filter(Boolean) as string[]) {
      await sleep(180);
      addLog(line);
    }

    await sleep(500);
    addLog(`⏳ Generating creator wallet (AES-256)...`);
    await sleep(600);
    addLog(`⏳ Deploying via Clanker SDK v4... (1-2 min)`);

    try {
      const result = await deployToken({
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        twitter: form.twitter || undefined,
        website: form.website || undefined,
        logoUrl: form.logoUrl || undefined,
        githubToken: ghUser.githubToken,
      });

      setDeployResult(result);
      await sleep(100);
      addLog(``);
      addLog(`✅ Deployment Complete!`);
      addLog(`  Contract : ${result.contractAddress}`);
      addLog(`  Wallet   : ${result.creatorWallet}`);
      addLog(`  Repo     : ${result.githubRepo}`);
      addLog(`  TX       : ${result.txHash}`);
      addLog(``);
      addLog(`💰 90% of all trading fees → your wallet. Forever.`);
      addLog(`$ _`);
      setDeployStep("done");
      setTimeout(() => fetchTokens(1, sort, search), 2500);
    } catch (err: any) {
      addLog(``);
      addLog(`❌ Error: ${err.message}`);
      setDeployError(err.message || "Deploy failed");
      setDeployStep("error");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const stepLabels = ["Token Info", "Confirm", "Deploying", "Done!"];
  const curStepIdx = { form:0, confirm:1, deploying:2, done:3, error:2 }[deployStep];
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
            <span style={{ fontSize:22 }}>⚡</span>
            <span style={{ fontWeight:700, fontSize:16, color:S.text, letterSpacing:"-0.01em" }}>DaiLaunch</span>
          </a>
          <div style={{ display:"flex", gap:4 }}>
            {["Dashboard","Tokens","My Tokens","Docs"].map((tab,i)=>(
              <div key={tab} style={{ padding:"6px 14px", borderRadius:8, fontSize:13, fontWeight:500,
                color:i===0?S.text:S.muted, cursor:"pointer",
                background:i===0?S.purpleD:"transparent",
                border:i===0?S.borderB:"1px solid transparent" }}>{tab}</div>
            ))}
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:7, height:7, background:S.green, borderRadius:"50%", boxShadow:`0 0 8px ${S.green}`, animation:"blink 2s ease-in-out infinite" }} />

            {/* Auth button */}
            {authLoading ? (
              <div style={{ fontSize:12, color:S.muted, fontFamily:S.mono }}>...</div>
            ) : ghUser ? (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <img src={ghUser.avatar} alt={ghUser.login} style={{ width:28, height:28, borderRadius:"50%", border:"2px solid var(--border-bright)" }} />
                <span style={{ fontSize:13, color:S.text, fontFamily:S.mono }}>@{ghUser.login}</span>
                <button onClick={logout} style={{ padding:"4px 10px", background:"rgba(255,255,255,0.05)", border:S.border, color:S.muted, borderRadius:6, fontSize:11, cursor:"pointer", fontFamily:S.sans }}>logout</button>
              </div>
            ) : (
              <a href={getGitHubLoginUrl()} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background:"rgba(255,255,255,0.06)", border:S.borderB, borderRadius:10, color:S.text, fontFamily:S.sans, fontSize:13, fontWeight:600, cursor:"pointer", textDecoration:"none" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                Login with GitHub
              </a>
            )}

            <button onClick={openDeploy} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", background:S.purple, border:"none", borderRadius:10, color:"white", fontFamily:S.sans, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              ⚡ Deploy Token
            </button>
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

        {/* ── TICKER ── */}
        {tokens.length > 0 && (
          <div style={{ overflow:"hidden", borderBottom:S.border, background:"rgba(106,32,240,.03)" }}>
            <div style={{ display:"flex", width:"max-content", animation:"ticker-scroll 30s linear infinite" }}>
              {tickerItems.map((t,i)=>(
                <div key={i} onClick={()=>router.push(`/token/${t.contractAddress}`)}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 24px", borderRight:S.border, cursor:"pointer", whiteSpace:"nowrap" }}>
                  <span style={{ fontFamily:S.mono, fontSize:12, fontWeight:700, color:S.text }}>{t.symbol}</span>
                  <span style={{ fontFamily:S.mono, fontSize:11, color:S.muted }}>{t.marketCap>0?fmt(t.marketCap):"—"}</span>
                  <span style={{ fontFamily:S.mono, fontSize:11, fontWeight:700, color:(t.priceChange24h??0)>=0?S.green:S.red }}>
                    {(t.priceChange24h??0)>=0?"+":""}{(t.priceChange24h??0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MAIN ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", flex:1 }}>

          {/* LEFT */}
          <div style={{ padding:"24px 28px", borderRight:S.border }}>
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
                <div key={token.id} className="fade-in" onClick={()=>router.push(`/token/${token.contractAddress}`)}
                  style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:S.border, cursor:"pointer", borderRadius:8, transition:"background .15s", animationDelay:`${i*.04}s` }}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(106,32,240,.06)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
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
                </div>
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
                { num:"04", title:"Earn Fees", desc:"90% of all trades → you" },
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
                {ghUser ? "⚡ Deploy Your Token" : "🔐 Login & Deploy"}
              </button>
            </div>

            <div style={{ padding:20, flex:1 }}>
              <div style={{ fontSize:11, fontFamily:S.mono, color:S.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>CLI Preview</div>
              <div style={{ background:"#060610", border:S.border, borderRadius:12, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", borderBottom:S.border }}>
                  {["#ff5f57","#febc2e","#28c840"].map((col,i)=>(
                    <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:col }} />
                  ))}
                  <span style={{ fontFamily:S.mono, fontSize:10, color:S.dim, marginLeft:8 }}>DAILAUNCH CLI</span>
                </div>
                <div style={{ padding:14, fontFamily:S.mono, fontSize:12, lineHeight:1.7 }}>
                  <div><span style={{ color:S.purpleL }}>$ </span><span style={{ color:"#a87fff" }}>gh auth login</span></div>
                  <div style={{ color:S.green }}>✓ Logged in as @you</div>
                  <div style={{ marginTop:6 }}><span style={{ color:S.purpleL }}>$ </span><span style={{ color:"#a87fff" }}>dailaunch deploy</span></div>
                  <div style={{ color:S.muted }}>? Token Name: <span style={{ color:S.green }}>MyToken</span></div>
                  <div style={{ color:S.green, marginTop:4 }}>✅ Token live on Base!</div>
                  <div style={{ color:S.muted, fontSize:11 }}>Contract: <span style={{ color:"#a87fff" }}>0xabc...def</span></div>
                  <div style={{ marginTop:6 }}><span style={{ color:S.purpleL }}>$ </span><span style={{ display:"inline-block", width:2, height:13, background:S.purpleL, verticalAlign:"middle", animation:"blink 1s infinite" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DEPLOY MODAL ───────────────────────────────────────────────────────── */}
      {deployOpen && (
        <div onClick={e=>{ if(e.target===e.currentTarget && deployStep!=="deploying") setDeployOpen(false); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:S.surface, border:S.borderB, borderRadius:20, width:"100%", maxWidth:560, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(0,0,0,.6)", overflow:"hidden" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:S.border }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:S.green, boxShadow:`0 0 8px ${S.green}` }} />
                <span style={{ fontFamily:S.mono, fontSize:13, color:S.text }}>Deploy Token — DaiLaunch</span>
                {ghUser && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8, padding:"3px 10px", background:S.purpleD, border:S.borderB, borderRadius:20 }}>
                    <img src={ghUser.avatar} alt="" style={{ width:16, height:16, borderRadius:"50%" }} />
                    <span style={{ fontSize:11, fontFamily:S.mono, color:S.purpleL }}>@{ghUser.login}</span>
                  </div>
                )}
              </div>
              {deployStep !== "deploying" && (
                <button onClick={()=>setDeployOpen(false)} style={{ background:"none", border:"none", color:S.muted, fontSize:16, cursor:"pointer" }}>✕</button>
              )}
            </div>

            {/* Steps */}
            <div style={{ display:"flex", borderBottom:S.border }}>
              {stepLabels.map((label,i)=>{
                const done = i < curStepIdx; const active = i === curStepIdx;
                return (
                  <div key={label} style={{ flex:1, padding:"9px 8px", fontSize:12, textAlign:"center", color:done?S.green:active?S.text:S.dim, background:active?S.purpleD:"transparent", borderRight:i<3?S.border:"none", fontFamily:S.sans, fontWeight:active?600:400 }}>
                    {done?"✅ ":active?"▶ ":"○ "}{label}
                  </div>
                );
              })}
            </div>

            {/* Content */}
            <div style={{ flex:1, overflowY:"auto", padding:24 }}>

              {/* FORM */}
              {deployStep === "form" && (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div style={{ fontSize:13, color:S.muted, lineHeight:1.6 }}>
                    Deploy token ke <strong style={{ color:S.text }}>Base Mainnet</strong> sebagai <strong style={{ color:S.green }}>@{ghUser?.login}</strong>. Kamu akan mendapat 90% dari semua trading fees.
                  </div>
                  <div><div style={lbl}>Token Name *</div><input style={input} placeholder="e.g. My Awesome Token" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
                  <div><div style={lbl}>Symbol * (max 10 chars)</div><input style={input} placeholder="e.g. MAT" value={form.symbol} maxLength={10} onChange={e=>setForm(f=>({...f,symbol:e.target.value.toUpperCase()}))} /></div>
                  <div><div style={lbl}>Twitter/X URL (optional)</div><input style={input} placeholder="https://x.com/mytoken" value={form.twitter} onChange={e=>setForm(f=>({...f,twitter:e.target.value}))} /></div>
                  <div><div style={lbl}>Website URL (optional)</div><input style={input} placeholder="https://mytoken.xyz" value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} /></div>
                  <div><div style={lbl}>Logo Image URL (optional)</div><input style={input} placeholder="https://..." value={form.logoUrl} onChange={e=>setForm(f=>({...f,logoUrl:e.target.value}))} /></div>
                  <button onClick={()=>setDeployStep("confirm")} disabled={!form.name.trim()||!form.symbol.trim()}
                    style={{ padding:"11px 0", background:(!form.name.trim()||!form.symbol.trim())?"rgba(106,32,240,.3)":S.purple, border:"none", borderRadius:10, color:"white", fontFamily:S.sans, fontWeight:700, fontSize:14, cursor:(!form.name.trim()||!form.symbol.trim())?"not-allowed":"pointer", marginTop:4 }}>
                    Next → Confirm
                  </button>
                </div>
              )}

              {/* CONFIRM */}
              {deployStep === "confirm" && (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div style={{ background:"rgba(0,229,160,.05)", border:"1px solid rgba(0,229,160,.2)", borderRadius:12, padding:18 }}>
                    <div style={{ color:S.green, fontWeight:700, fontSize:14, marginBottom:12 }}>📋 Deploy Summary</div>
                    {[
                      ["Deployer", `@${ghUser?.login}`],
                      ["Token Name", form.name],
                      ["Symbol", form.symbol.toUpperCase()],
                      form.twitter?["Twitter", form.twitter]:null,
                      form.website?["Website", form.website]:null,
                      ["Chain", "Base Mainnet (8453)"],
                      ["Creator Fee", "90% of all trading fees → your wallet"],
                    ].filter(Boolean).map((row: any)=>(
                      <div key={row[0]} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(0,229,160,.1)", fontSize:13 }}>
                        <span style={{ color:S.muted, fontFamily:S.mono }}>{row[0]}</span>
                        <span style={{ color:S.text, fontWeight:500, maxWidth:"60%", textAlign:"right", wordBreak:"break-all" }}>{row[1]}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"rgba(106,32,240,.08)", border:S.borderB, borderRadius:10, padding:12, fontSize:12, color:S.muted, lineHeight:1.6 }}>
                    ⚠️ Deployment di <strong>Base Mainnet</strong> membutuhkan ETH untuk gas. Platform wallet akan digunakan untuk membayar gas fee.
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>setDeployStep("form")} style={{ flex:1, padding:"10px 0", background:"transparent", border:S.border, borderRadius:10, color:S.muted, fontFamily:S.sans, fontWeight:600, fontSize:13, cursor:"pointer" }}>
                      ← Edit
                    </button>
                    <button onClick={runDeploy} style={{ flex:2, padding:"10px 0", background:S.purple, border:"none", borderRadius:10, color:"white", fontFamily:S.sans, fontWeight:700, fontSize:14, cursor:"pointer" }}>
                      ⚡ Deploy to Base Mainnet
                    </button>
                  </div>
                </div>
              )}

              {/* DEPLOYING / DONE / ERROR → Terminal */}
              {(deployStep==="deploying"||deployStep==="done"||deployStep==="error") && (
                <div>
                  <div ref={termRef} style={{ background:"#060610", border:S.border, borderRadius:12, padding:16, fontFamily:S.mono, fontSize:12, lineHeight:1.9, maxHeight:320, overflowY:"auto" }}>
                    {deployLog.map((line,i)=>{
                      const isOk = line.startsWith("✅")||line.startsWith("💰")||line.startsWith("✓");
                      const isErr = line.startsWith("❌");
                      const isWarn = line.startsWith("⏳");
                      const isCmd = line.startsWith("$");
                      return (
                        <div key={i} style={{ color:isOk?S.green:isErr?S.red:isWarn?"#f59e0b":isCmd?S.purpleL:S.muted }}>
                          {line || "\u00A0"}
                        </div>
                      );
                    })}
                    {deployStep==="deploying" && <div style={{ display:"inline-block", width:8, height:14, background:S.green, verticalAlign:"middle", animation:"blink .8s infinite" }} />}
                  </div>

                  {deployStep==="done" && deployResult && (
                    <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ background:"rgba(0,229,160,.06)", border:"1px solid rgba(0,229,160,.2)", borderRadius:10, padding:12, fontFamily:S.mono, fontSize:12 }}>
                        <div style={{ color:S.green, fontWeight:700, marginBottom:8 }}>🎉 Token Live on Base!</div>
                        <div style={{ color:S.muted }}>Contract : <span style={{ color:"#a87fff" }}>{shortAddr(deployResult.contractAddress)}</span></div>
                        <div style={{ color:S.muted }}>Wallet   : <span style={{ color:"#a87fff" }}>{shortAddr(deployResult.creatorWallet)}</span></div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        {[
                          { label:"BaseScan ↗", href:deployResult.baseScan },
                          { label:"DexScreener ↗", href:deployResult.dexScreener },
                          deployResult.githubRepo?{ label:"GitHub ↗", href:deployResult.githubRepo }:null,
                        ].filter(Boolean).map((l:any)=>(
                          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                            style={{ flex:1, padding:"9px 0", background:S.purpleD, border:S.borderB, borderRadius:8, color:S.text, textAlign:"center", textDecoration:"none", fontSize:12, fontFamily:S.sans }}>
                            {l.label}
                          </a>
                        ))}
                      </div>
                      <button onClick={()=>{ setDeployOpen(false); fetchTokens(1,sort,search); }}
                        style={{ padding:"11px 0", background:S.purple, border:"none", borderRadius:10, color:"white", fontFamily:S.sans, fontWeight:700, fontSize:14, cursor:"pointer" }}>
                        ✅ Done — View Dashboard
                      </button>
                    </div>
                  )}

                  {deployStep==="error" && (
                    <div style={{ marginTop:14, display:"flex", gap:10 }}>
                      <button onClick={()=>setDeployStep("confirm")} style={{ flex:1, padding:"10px 0", background:"transparent", border:S.border, borderRadius:10, color:S.muted, fontFamily:S.sans, fontWeight:600, fontSize:13, cursor:"pointer" }}>← Retry</button>
                      <div style={{ flex:2, padding:"10px 14px", background:"rgba(255,68,102,.08)", border:"1px solid rgba(255,68,102,.2)", borderRadius:10, color:S.red, fontSize:12, fontFamily:S.mono }}>{deployError}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding:"12px 20px", borderTop:S.border, fontSize:12, color:S.dim, fontFamily:S.sans }}>
              Powered by <span style={{ color:S.purpleL }}>Clanker SDK v4</span> · Base Mainnet · 90% fees → creator
            </div>
          </div>
        </div>
      )}
    </>
  );
}
