"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

interface Token {
  id: string; contractAddress: string; name: string; symbol: string;
  deployer: string; creatorWallet: string; githubRepo: string;
  twitter?: string; website?: string; txHash: string; deployedAt: string;
  tradeVolume: number; price: number; marketCap: number;
  liquidity: number; holders: number; priceChange24h: number;
}

function fmtU(n: number) { if(n>=1e6)return`$${(n/1e6).toFixed(2)}M`; if(n>=1e3)return`$${(n/1e3).toFixed(1)}K`; return`$${n.toFixed(0)}`; }
function fmtP(n: number) { if(n<0.00001)return`$${n.toFixed(10)}`; if(n<0.01)return`$${n.toFixed(6)}`; return`$${n.toFixed(4)}`; }
function shortAddr(a: string) { return a?`${a.slice(0,6)}…${a.slice(-4)}`:""; }
function timeAgo(d: string) { const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60)return`${s}s ago`; if(s<3600)return`${Math.floor(s/60)}m ago`; if(s<86400)return`${Math.floor(s/3600)}h ago`; return`${Math.floor(s/86400)}d ago`; }
function avatarColor(a: string) { const c=["#4c1d95","#1e3a8a","#14532d","#7c2d12","#1e3a5f","#6b21a8","#164e63","#713f12","#3b0764","#0c4a6e"]; return c[(a?.charCodeAt(2)??0)%c.length]; }
function rnd(a: number, b: number) { return Math.random()*(b-a)+a; }

function PriceChart({ prices, isUp }: { prices: number[]; isUp: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovIdx, setHovIdx] = useState(-1);
  const [tooltip, setTooltip] = useState<{x:number;y:number;val:string}|null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !prices.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.offsetWidth || 600;
    const H = 250;
    canvas.width = W; canvas.height = H;
    const PAD = { top:12, right:64, bottom:28, left:8 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || max * 0.01;
    const lineCol = isUp ? "#00d98b" : "#ff3d5a";
    const glowCol = isUp ? "rgba(0,217,139," : "rgba(255,61,90,";
    const xOf = (i: number) => PAD.left + (i/(prices.length-1))*cW;
    const yOf = (v: number) => PAD.top + cH - ((v-min)/range)*cH;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle = "rgba(120,60,255,0.06)"; ctx.lineWidth = 1;
    for(let g=0;g<=4;g++){ const y=PAD.top+(g/4)*cH; ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(W-PAD.right,y); ctx.stroke(); }
    const grad = ctx.createLinearGradient(0,PAD.top,0,PAD.top+cH);
    grad.addColorStop(0,glowCol+"0.18)"); grad.addColorStop(1,glowCol+"0)");
    ctx.beginPath(); ctx.moveTo(xOf(0),yOf(prices[0]));
    for(let i=1;i<prices.length;i++){ const cx=(xOf(i-1)+xOf(i))/2; ctx.bezierCurveTo(cx,yOf(prices[i-1]),cx,yOf(prices[i]),xOf(i),yOf(prices[i])); }
    ctx.lineTo(xOf(prices.length-1),PAD.top+cH); ctx.lineTo(xOf(0),PAD.top+cH); ctx.closePath();
    ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(xOf(0),yOf(prices[0]));
    for(let i=1;i<prices.length;i++){ const cx=(xOf(i-1)+xOf(i))/2; ctx.bezierCurveTo(cx,yOf(prices[i-1]),cx,yOf(prices[i]),xOf(i),yOf(prices[i])); }
    ctx.strokeStyle=lineCol; ctx.lineWidth=2; ctx.shadowBlur=6; ctx.shadowColor=lineCol; ctx.stroke(); ctx.shadowBlur=0;
    const lastY=yOf(prices[prices.length-1]);
    ctx.strokeStyle=lineCol+"88"; ctx.lineWidth=1; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(PAD.left,lastY); ctx.lineTo(W-PAD.right-4,lastY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=lineCol; ctx.font="bold 9px monospace"; ctx.textAlign="right";
    ctx.fillText(fmtP(prices[prices.length-1]),W-4,lastY+3);
    ctx.fillStyle="rgba(200,190,255,0.22)"; ctx.font="9px monospace"; ctx.textAlign="right";
    for(let g=0;g<=4;g++){ const v=min+(1-g/4)*range; const y=PAD.top+(g/4)*cH; ctx.fillText(fmtP(v),W-4,y+3); }
    if(hovIdx>=0&&hovIdx<prices.length){
      const hx=xOf(hovIdx),hy=yOf(prices[hovIdx]);
      ctx.strokeStyle="rgba(200,190,255,0.2)"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(hx,PAD.top); ctx.lineTo(hx,PAD.top+cH); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(hx,hy,4,0,Math.PI*2);
      ctx.fillStyle=lineCol; ctx.shadowBlur=10; ctx.shadowColor=lineCol; ctx.fill(); ctx.shadowBlur=0;
      setTooltip({x:hx+10,y:hy-10,val:fmtP(prices[hovIdx])});
    } else { setTooltip(null); }
  }, [prices, isUp, hovIdx]);

  useEffect(()=>{ draw(); },[draw]);
  useEffect(()=>{ const r=()=>draw(); window.addEventListener("resize",r); return()=>window.removeEventListener("resize",r); },[draw]);

  const onMove=(e: React.MouseEvent<HTMLCanvasElement>)=>{
    const c=canvasRef.current!; const rect=c.getBoundingClientRect();
    const mx=e.clientX-rect.left; const W=c.offsetWidth;
    const idx=Math.round(((mx-8)/(W-72))*(prices.length-1));
    setHovIdx(Math.max(0,Math.min(prices.length-1,idx)));
  };

  return (
    <div style={{position:"relative",width:"100%",height:250}}>
      <canvas ref={canvasRef} style={{width:"100%",height:250,display:"block",cursor:"crosshair"}}
        onMouseMove={onMove} onMouseLeave={()=>setHovIdx(-1)} />
      {tooltip&&(
        <div style={{position:"absolute",left:tooltip.x,top:tooltip.y,background:"rgba(13,13,26,0.9)",
          border:"1px solid rgba(120,60,255,0.3)",borderRadius:6,padding:"4px 8px",
          fontSize:11,fontFamily:"monospace",color:"#eeeaff",pointerEvents:"none",whiteSpace:"nowrap"}}>
          {tooltip.val}
        </div>
      )}
    </div>
  );
}

export default function TokenDetailClient({ token }: { token: Token }) {
  const router = useRouter();
  const [prices, setPrices] = useState<number[]>([]);
  const [livePrice, setLivePrice] = useState(token.price||0.000003);
  const [liveMc, setLiveMc] = useState(token.marketCap||0);
  const [liveChange, setLiveChange] = useState(token.priceChange24h||0);
  const [copied, setCopied] = useState<string|null>(null);
  const [tf, setTf] = useState("1m");
  const tfPoints: Record<string,number> = {"1s":80,"1m":60,"5m":48,"1h":40,"4h":30,"1D":20};

  const genPrices = useCallback((base: number, n: number) => {
    let p=base||rnd(0.0000001,0.05); const arr: number[]=[];
    for(let i=0;i<n;i++){p=Math.max(1e-12,p*(1+rnd(-0.04,0.05)));arr.push(p);}
    setPrices(arr);
  },[]);

  useEffect(()=>{genPrices(livePrice,60);},[]);
  useEffect(()=>{
    const iv=setInterval(()=>{
      setLivePrice(p=>{const np=Math.max(1e-12,p*(1+rnd(-0.03,0.04)));setPrices(prev=>[...prev.slice(-119),np]);return np;});
      setLiveMc(m=>m*(1+rnd(-0.01,0.015)));
      setLiveChange(c=>parseFloat((c+rnd(-0.5,0.7)).toFixed(1)));
    },1500);
    return()=>clearInterval(iv);
  },[]);

  const isUp=liveChange>=0;
  const avColor=avatarColor(token.contractAddress);
  const copy=(text: string,key: string)=>{
    try{navigator.clipboard.writeText(text).then(()=>{setCopied(key);setTimeout(()=>setCopied(null),1500);});}catch(e){}
  };

  const S={
    surface:"rgba(13,13,26,0.9)",border:"1px solid rgba(120,60,255,0.12)",
    borderB:"1px solid rgba(120,60,255,0.28)",purple:"#6a20f0",
    purpleL:"#9055ff",purpleD:"rgba(106,32,240,0.12)",
    green:"#00d98b",red:"#ff3d5a",text:"#eeeaff",
    muted:"rgba(220,210,255,0.45)",dim:"rgba(200,190,255,0.22)",
    mono:"'Space Mono',monospace",sans:"'DM Sans',sans-serif",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .fi{animation:fadeIn 0.4s ease forwards;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#07070f;} ::-webkit-scrollbar-thumb{background:rgba(120,60,255,0.2);border-radius:2px;}
      `}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse 60% 40% at 0% 0%,rgba(106,32,240,0.1) 0%,transparent 55%),radial-gradient(ellipse 40% 50% at 100% 100%,rgba(60,10,180,0.07) 0%,transparent 55%)"}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"linear-gradient(rgba(100,50,220,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(100,50,220,0.03) 1px,transparent 1px)",backgroundSize:"46px 46px"}}/>
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif"}}>

        {/* NAV */}
        <nav style={{display:"flex",alignItems:"center",padding:"0 28px",height:56,borderBottom:S.border,background:"rgba(7,7,15,0.88)",backdropFilter:"blur(24px)",position:"sticky",top:0,zIndex:200,gap:14}}>
          <a href="/" style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
            <span style={{fontSize:20}}>⚡</span>
            <span style={{fontWeight:700,fontSize:14,color:S.text}}>DaiLaunch</span>
          </a>
          <span style={{color:S.dim,fontSize:13}}>›</span>
          <span onClick={()=>router.push("/")} style={{color:S.muted,fontSize:13,cursor:"pointer"}}>← All Tokens</span>
          <span style={{color:S.dim,fontSize:13}}>›</span>
          <span style={{fontSize:13,fontWeight:600,fontFamily:S.mono,color:S.text}}>${token.symbol}</span>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:"rgba(0,217,139,0.1)",border:"1px solid rgba(0,217,139,0.25)",fontSize:11,fontFamily:S.mono,color:S.green}}>
            <div style={{width:6,height:6,background:S.green,borderRadius:"50%",boxShadow:`0 0 7px ${S.green}`,animation:"blink 2s ease-in-out infinite"}}/>Live
          </div>
        </nav>

        <div style={{maxWidth:1280,margin:"0 auto",width:"100%",padding:"20px"}}>

          {/* Header */}
          <div className="fi" style={{display:"flex",alignItems:"center",gap:16,background:S.surface,border:S.borderB,borderRadius:16,padding:"18px 22px",marginBottom:16}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:avColor,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:S.mono,fontSize:17,fontWeight:700,color:"#fff",position:"relative"}}>
              {(token.symbol??"?").slice(0,2)}
              <div style={{position:"absolute",bottom:-2,right:-2,width:17,height:17,borderRadius:"50%",background:"#0052ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"white",border:"2px solid #07070f"}}>B</div>
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:20,fontWeight:700,fontFamily:S.mono,color:S.text}}>${token.symbol}</span>
                <span style={{fontSize:13,color:S.muted}}>{token.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:5,flexWrap:"wrap"}}>
                <span style={{fontSize:22,fontWeight:700,color:S.text,fontFamily:S.mono}}>{fmtP(livePrice)}</span>
                <span style={{fontSize:12,fontWeight:700,fontFamily:S.mono,padding:"2px 7px",borderRadius:5,color:isUp?S.green:S.red,background:isUp?"rgba(0,217,139,0.1)":"rgba(255,61,90,0.1)"}}>
                  {isUp?"+":""}{liveChange.toFixed(1)}%
                </span>
              </div>
              <div style={{fontSize:11,color:S.muted,marginTop:3,fontFamily:S.mono}}>
                Deployed by <span style={{color:S.purpleL}}>@{token.deployer}</span> · {timeAgo(token.deployedAt)}
              </div>
            </div>
            <a href={`https://app.uniswap.org/swap?outputCurrency=${token.contractAddress}&chain=base`}
              target="_blank" rel="noopener noreferrer"
              style={{padding:"9px 18px",background:S.purple,borderRadius:10,color:"white",fontFamily:S.sans,fontWeight:700,fontSize:13,textDecoration:"none",flexShrink:0}}>
              🔄 Trade
            </a>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[
              {l:"Market Cap",v:fmtU(liveMc),s:"USD"},
              {l:"Holders",v:token.holders>0?token.holders.toLocaleString():"—",s:"wallets"},
              {l:"Liquidity",v:token.liquidity>0?fmtU(token.liquidity):"—",s:"in pool"},
              {l:"Volume 24h",v:token.tradeVolume>0?fmtU(token.tradeVolume):"—",s:"trading"},
            ].map(s=>(
              <div key={s.l} className="fi" style={{background:S.surface,border:S.border,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:9,fontFamily:S.mono,color:S.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{s.l}</div>
                <div style={{fontSize:16,fontWeight:700,color:S.text,marginBottom:1}}>{s.v}</div>
                <div style={{fontSize:9,color:S.muted,fontFamily:S.mono}}>{s.s}</div>
              </div>
            ))}
          </div>

          {/* Chart + Sidebar */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:14}}>
            <div style={{background:S.surface,border:S.border,borderRadius:12,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:S.border}}>
                <span style={{fontSize:11,fontFamily:S.mono,color:S.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Price Chart</span>
                <div style={{display:"flex",gap:4}}>
                  {["1s","1m","5m","1h","4h","1D"].map(t=>(
                    <button key={t} onClick={()=>{setTf(t);genPrices(livePrice,tfPoints[t]);}}
                      style={{padding:"3px 7px",borderRadius:4,fontSize:10,fontFamily:S.mono,cursor:"pointer",
                        border:S.border,background:tf===t?S.purpleD:"transparent",color:tf===t?S.purpleL:S.muted}}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{padding:"10px 10px 6px"}}><PriceChart prices={prices} isUp={isUp}/></div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* Deployer */}
              <div style={{background:S.surface,border:S.border,borderRadius:10,padding:14}}>
                <div style={{fontSize:9,fontFamily:S.mono,color:S.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Deployer</div>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:avColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>👤</div>
                  <div>
                    <div style={{fontSize:10,color:S.muted,fontFamily:S.mono}}>GitHub Account</div>
                    <div style={{fontSize:12,fontWeight:600,color:S.purpleL,fontFamily:S.mono}}>@{token.deployer}</div>
                  </div>
                </div>
                <div style={{marginTop:9,padding:"5px 9px",background:"rgba(0,217,139,0.06)",border:"1px solid rgba(0,217,139,0.15)",borderRadius:5,fontSize:10,color:S.green,fontFamily:S.mono,textAlign:"center"}}>
                  💰 Earning 70% of all trading fees
                </div>
              </div>

              {/* Token Info */}
              <div style={{background:S.surface,border:S.border,borderRadius:10,padding:14}}>
                <div style={{fontSize:9,fontFamily:S.mono,color:S.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Token Info</div>
                {[["Price",fmtP(livePrice)],["Created",timeAgo(token.deployedAt)],["Chain","Base Mainnet"],["Standard","ERC-20"],["Creator Fee","70% of all trades"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:S.border,fontSize:11}}>
                    <span style={{color:S.muted,fontFamily:S.mono}}>{k}</span>
                    <span style={{color:k==="Creator Fee"?S.green:S.text,fontFamily:S.mono}}>{v}</span>
                  </div>
                ))}
                {[["CA",token.contractAddress,"ca"],["Creator",token.creatorWallet,"cr"]].map(([k,v,id])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:id==="ca"?S.border:"none",fontSize:11}}>
                    <span style={{color:S.muted,fontFamily:S.mono}}>{k}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontFamily:S.mono,color:S.text}}>{shortAddr(v)}</span>
                      <button onClick={()=>copy(v,id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11}}>{copied===id?"✅":"📋"}</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Links */}
              <div style={{background:S.surface,border:S.border,borderRadius:10,padding:14}}>
                <div style={{fontSize:9,fontFamily:S.mono,color:S.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Links</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[
                    {icon:"🔍",label:"BaseScan",href:`https://basescan.org/token/${token.contractAddress}`},
                    {icon:"📊",label:"DexScreener",href:`https://dexscreener.com/base/${token.contractAddress}`},
                    token.githubRepo?{icon:"🐙",label:"GitHub Repo",href:token.githubRepo}:null,
                    token.website?{icon:"🌐",label:"Website",href:token.website}:null,
                    token.twitter?{icon:"🐦",label:"Twitter / X",href:`https://twitter.com/${token.twitter}`}:null,
                  ].filter(Boolean).map((l: any)=>(
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                      style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",background:"rgba(255,255,255,0.03)",border:S.border,borderRadius:7,color:S.muted,textDecoration:"none",fontSize:11,fontFamily:S.sans,transition:"color 0.15s"}}
                      onMouseEnter={e=>(e.currentTarget.style.color=S.text)}
                      onMouseLeave={e=>(e.currentTarget.style.color=S.muted)}>
                      <span>{l.icon}</span><span style={{flex:1}}>{l.label}</span><span style={{color:S.dim}}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
