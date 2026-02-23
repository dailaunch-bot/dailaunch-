"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase =
  | "idle"
  | "ask_name"
  | "ask_symbol"
  | "ask_twitter"
  | "ask_website"
  | "ask_logo"
  | "confirm"
  | "deploying"
  | "done"
  | "error"
  | "waiting_login";

interface Line {
  text: string;
  type: "cmd" | "prompt" | "info" | "success" | "error" | "warn" | "muted" | "blank";
}

interface FormData {
  name: string;
  symbol: string;
  twitter: string;
  website: string;
  logoUrl: string;
}

interface AuthUser {
  githubLogin:  string;
  githubName:   string;
  githubAvatar: string;
  githubToken:  string;
  expiresAt:    string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.dailaunch.online";
const STORAGE_KEY = "dailaunch_session";

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadSession(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: AuthUser = JSON.parse(stored);
    if (new Date(parsed.expiresAt) > new Date()) return parsed;
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function CliPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState("");
  const [form, setForm] = useState<FormData>({ name: "", symbol: "", twitter: "", website: "", logoUrl: "" });
  const [isTyping, setIsTyping] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, isTyping]);

  // Focus input
  useEffect(() => {
    if (phase !== "deploying" && phase !== "done") {
      inputRef.current?.focus();
    }
  }, [phase]);

  const addLine = useCallback((text: string, type: Line["type"] = "muted") => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const addLines = useCallback(
    async (entries: [string, Line["type"]][], delay = 60) => {
      for (const [text, type] of entries) {
        await sleep(delay);
        setLines((prev) => [...prev, { text, type }]);
      }
    },
    []
  );

  // ── Handle ?session=xxx dari URL (dari dailaunch login di CLI atau OAuth redirect) ──
  useEffect(() => {
    const handleUrlSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionToken = params.get("session");
      if (!sessionToken) return;

      // Bersihkan token dari URL
      window.history.replaceState({}, "", window.location.pathname);

      try {
        const res = await fetch(`${API}/auth/session?token=${sessionToken}`);
        if (!res.ok) {
          addLine("  ✗ Session invalid or expired.", "error");
          return;
        }
        const data = await res.json();
        const authUser: AuthUser = {
          githubLogin:  data.githubLogin,
          githubName:   data.githubName,
          githubAvatar: data.githubAvatar,
          githubToken:  data.githubToken,
          expiresAt:    data.expiresAt,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
        setUser(authUser);

        const expiry = new Date(authUser.expiresAt).toLocaleString("id-ID");
        await addLines([
          ["", "blank"],
          ["  ✅ login successful!", "success"],
          ["", "blank"],
          [`  GitHub  : @${authUser.githubLogin}`, "info"],
          [`  Expires : ${expiry}`, "muted"],
          ["", "blank"],
          ["  Sekarang kamu bisa menjalankan  dailaunch deploy", "muted"],
          ["", "blank"],
        ], 60);
        setPhase("idle");
      } catch {
        addLine("  ✗ Gagal verifikasi session.", "error");
      }
    };

    // Restore session dari localStorage juga
    const stored = loadSession();
    if (stored) setUser(stored);

    handleUrlSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boot sequence
  useEffect(() => {
    const boot = async () => {
      await sleep(300);
      setIsTyping(true);
      await addLines(
        [
          ["", "blank"],
          ["  ██████╗  █████╗ ██╗██╗      █████╗ ██╗   ██╗███╗   ██╗ ██████╗██╗  ██╗", "info"],
          ["  ██╔══██╗██╔══██╗██║██║     ██╔══██╗██║   ██║████╗  ██║██╔════╝██║  ██║", "info"],
          ["  ██║  ██║███████║██║██║     ███████║██║   ██║██╔██╗ ██║██║     ███████║", "info"],
          ["  ██║  ██║██╔══██║██║██║     ██╔══██║██║   ██║██║╚██╗██║██║     ██╔══██║", "info"],
          ["  ██████╔╝██║  ██║██║███████╗██║  ██║╚██████╔╝██║ ╚████║╚██████╗██║  ██║", "info"],
          ["  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝", "info"],
          ["", "blank"],
          ["  Web Terminal v1.0.0  |  Base Mainnet  |  Powered by Clanker SDK v4", "muted"],
          ["  Deploy tokens directly from your browser. No installs needed.", "muted"],
          ["", "blank"],
          ["─────────────────────────────────────────────────────────────────────────────", "muted"],
          ["", "blank"],
        ],
        40
      );
      setIsTyping(false);
      await sleep(100);
      addLine("  Type  dailaunch deploy  to launch your token on Base Mainnet.", "muted");
      addLine("  Type  help  to see all commands.", "muted");
      addLine("", "blank");
      setPhase("idle");
    };
    boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Input handling ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    setInput("");

    if (phase === "idle") {
      addLine(`$ ${val}`, "cmd");

      // ── dailaunch login ──────────────────────────────────────────────────
      if (val === "dailaunch login" || val === "login") {
        const currentUser = loadSession();
        if (currentUser) {
          const expiry = new Date(currentUser.expiresAt).toLocaleString("id-ID");
          await addLines([
            ["", "blank"],
            ["  ✅ Sudah login!", "success"],
            [`  GitHub  : @${currentUser.githubLogin}`, "info"],
            [`  Expires : ${expiry}`, "muted"],
            ["", "blank"],
            ["  Gunakan  dailaunch logout  untuk keluar.", "muted"],
            ["", "blank"],
          ], 50);
          return;
        }

        await addLines([
          ["", "blank"],
          ["  ⚡ DaiLaunch Web Login", "info"],
          ["  ──────────────────────────────", "muted"],
          ["", "blank"],
          ["  Menghubungkan ke GitHub OAuth...", "warn"],
        ], 60);
        await sleep(800);
        await addLines([
          ["  ✓ Redirect URL dibuat", "success"],
          ["", "blank"],
          ["  Membuka GitHub di browser...", "warn"],
        ], 80);
        await sleep(600);
        addLine("", "blank");
        addLine("  Kamu akan diarahkan ke GitHub untuk login.", "muted");
        addLine("  Setelah login, kamu otomatis kembali ke halaman ini.", "muted");
        addLine("", "blank");
        setPhase("waiting_login");
        await sleep(1200);
        // Redirect ke GitHub OAuth (backend sudah handle callback ke dashboard)
        window.location.href = `${API}/auth/github`;
        return;
      }

      // ── dailaunch logout ─────────────────────────────────────────────────
      if (val === "dailaunch logout" || val === "logout") {
        const currentUser = loadSession();
        if (!currentUser && !user) {
          await addLines([
            ["", "blank"],
            ["  Kamu belum login.", "warn"],
            ["  Gunakan  dailaunch login  untuk login.", "muted"],
            ["", "blank"],
          ], 50);
          return;
        }
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        await addLines([
          ["", "blank"],
          ["  ✅ Logout berhasil.", "success"],
          ["  Session telah dihapus.", "muted"],
          ["", "blank"],
          ["  Gunakan  dailaunch login  untuk login kembali.", "muted"],
          ["", "blank"],
        ], 60);
        return;
      }

      // ── dailaunch whoami ─────────────────────────────────────────────────
      if (val === "dailaunch whoami" || val === "whoami") {
        const currentUser = loadSession();
        if (!currentUser) {
          await addLines([
            ["", "blank"],
            ["  Belum login. Gunakan  dailaunch login  terlebih dahulu.", "warn"],
            ["", "blank"],
          ], 50);
          return;
        }
        const expiry = new Date(currentUser.expiresAt).toLocaleString("id-ID");
        await addLines([
          ["", "blank"],
          [`  GitHub  : @${currentUser.githubLogin}`, "info"],
          [`  Name    : ${currentUser.githubName || "-"}`, "muted"],
          [`  Expires : ${expiry}`, "muted"],
          ["", "blank"],
        ], 50);
        return;
      }

      // ── dailaunch deploy ─────────────────────────────────────────────────
      if (val === "dailaunch deploy" || val === "deploy") {
        await startDeploy();
        return;
      }

      // ── help ─────────────────────────────────────────────────────────────
      if (val === "help") {
        await addLines([
          ["", "blank"],
          ["  Available commands:", "muted"],
          ["    dailaunch login    →  Login dengan GitHub", "muted"],
          ["    dailaunch logout   →  Logout dari session", "muted"],
          ["    dailaunch whoami   →  Lihat info user yang sedang login", "muted"],
          ["    dailaunch deploy   →  Deploy token baru ke Base Mainnet", "muted"],
          ["    clear              →  Bersihkan terminal", "muted"],
          ["    help               →  Tampilkan bantuan ini", "muted"],
          ["", "blank"],
        ], 40);
        return;
      }

      // ── clear ─────────────────────────────────────────────────────────────
      if (val === "clear") {
        setLines([]);
        addLine("", "blank");
        addLine("  Type  dailaunch deploy  to launch your token.", "muted");
        addLine("", "blank");
        return;
      }

      if (val === "") return;

      addLine(`  command not found: ${val}`, "error");
      addLine("  Type 'help' for available commands.", "muted");
      addLine("", "blank");
      return;
    }

    // ── Step-by-step form ──────────────────────────────────────────────────
    if (phase === "ask_name") {
      if (!val) { addLine("  ✗ Token name is required.", "error"); return; }
      addLine(`? Token Name: ${val}`, "prompt");
      setForm((f) => ({ ...f, name: val }));
      addLine("", "blank");
      addLine("? Ticker Symbol (e.g. DGRKT, max 10 chars):", "prompt");
      setPhase("ask_symbol");
      return;
    }

    if (phase === "ask_symbol") {
      const sym = val.toUpperCase().slice(0, 10);
      if (!sym) { addLine("  ✗ Symbol is required.", "error"); return; }
      addLine(`? Symbol: ${sym}`, "prompt");
      setForm((f) => ({ ...f, symbol: sym }));
      addLine("", "blank");
      addLine("? Twitter/X URL (optional, press Enter to skip):", "prompt");
      setPhase("ask_twitter");
      return;
    }

    if (phase === "ask_twitter") {
      addLine(`? Twitter/X URL: ${val || "(skipped)"}`, "prompt");
      setForm((f) => ({ ...f, twitter: val }));
      addLine("", "blank");
      addLine("? Website URL (optional, press Enter to skip):", "prompt");
      setPhase("ask_website");
      return;
    }

    if (phase === "ask_website") {
      addLine(`? Website URL: ${val || "(skipped)"}`, "prompt");
      setForm((f) => ({ ...f, website: val }));
      addLine("", "blank");
      addLine("? Logo Image URL (optional, press Enter to skip):", "prompt");
      setPhase("ask_logo");
      return;
    }

    if (phase === "ask_logo") {
      addLine(`? Logo URL: ${val || "(skipped)"}`, "prompt");
      const finalForm = { ...form, logoUrl: val };
      setForm(finalForm);
      addLine("", "blank");
      await showConfirm(finalForm);
      return;
    }

    if (phase === "confirm") {
      addLine(`? Confirm deploy? ${val}`, "prompt");
      if (val.toLowerCase() === "y" || val.toLowerCase() === "yes") {
        await runDeploy();
      } else {
        await addLines([
          ["", "blank"],
          ["  Deployment cancelled.", "warn"],
          ["", "blank"],
          ["  Type  dailaunch deploy  to start over.", "muted"],
          ["", "blank"],
        ], 50);
        setPhase("idle");
      }
      return;
    }
  };

  const startDeploy = async () => {
    await addLines([
      ["", "blank"],
      ["  ⚡ DaiLaunch Token Deployer", "info"],
      ["  ─────────────────────────────", "muted"],
      ["", "blank"],
      ["? Token Name (e.g. My Awesome Token):", "prompt"],
    ], 50);
    setPhase("ask_name");
  };

  const showConfirm = async (f: FormData) => {
    await addLines([
      ["  ┌─────────────────────────────────────────────┐", "muted"],
      ["  │           📋  DEPLOY SUMMARY                │", "muted"],
      ["  ├─────────────────────────────────────────────┤", "muted"],
      [`  │  Name    : ${f.name.padEnd(33)}│`, "info"],
      [`  │  Symbol  : ${f.symbol.padEnd(33)}│`, "info"],
      [`  │  Twitter : ${(f.twitter || "—").padEnd(33)}│`, "muted"],
      [`  │  Website : ${(f.website || "—").padEnd(33)}│`, "muted"],
      ["  │  Chain   : Base Mainnet (8453)              │", "muted"],
      ["  │  Fee     : 90% trading fees → creator       │", "success"],
      ["  └─────────────────────────────────────────────┘", "muted"],
      ["", "blank"],
      ["? Deploy to Base Mainnet? (y/n):", "prompt"],
    ], 40);
    setPhase("confirm");
  };

  const runDeploy = async () => {
    setPhase("deploying");
    const currentForm = form;
    const currentUser = loadSession();

    await addLines([
      ["", "blank"],
      ["$ dailaunch deploy --network base-mainnet", "cmd"],
      ["", "blank"],
      ["  ⏳ Connecting to Base Mainnet...", "warn"],
    ], 120);

    await sleep(600);
    addLine("  ✓ Connected to Base (chain id: 8453)", "success");
    await sleep(400);
    addLine("  ⏳ Generating creator wallet (AES-256)...", "warn");
    await sleep(700);
    addLine("  ✓ Wallet generated", "success");
    await sleep(300);
    addLine("  ⏳ Deploying via Clanker SDK v4... (1-2 min)", "warn");
    addLine("", "blank");

    try {
      // Jika user sudah login, pakai endpoint yang authenticated
      const endpoint = currentUser
        ? `${API}/api/deploy`
        : `${API}/api/deploy/web`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (currentUser) headers["x-github-token"] = currentUser.githubToken;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name:    currentForm.name,
          symbol:  currentForm.symbol,
          twitter: currentForm.twitter || undefined,
          website: currentForm.website || undefined,
          logoUrl: currentForm.logoUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");

      setDeployResult(data);

      await addLines([
        ["  ✅ Deployment Complete!", "success"],
        ["", "blank"],
        [`  Contract  : ${data.contractAddress}`, "info"],
        [`  Wallet    : ${data.creatorWallet}`, "info"],
        [`  TX Hash   : ${data.txHash}`, "muted"],
        [`  GitHub    : ${data.githubRepo}`, "muted"],
        ["", "blank"],
        ["  💰 90% of ALL trading fees go to your creator wallet. Forever.", "success"],
        ["", "blank"],
        ["─────────────────────────────────────────────────────────────────────────────", "muted"],
        ["", "blank"],
        ["  🔗 Links:", "info"],
        [`  BaseScan    → ${data.baseScan}`, "muted"],
        [`  DexScreener → ${data.dexScreener}`, "muted"],
        ["", "blank"],
        ["$ _", "cmd"],
      ], 80);

      setPhase("done");
    } catch (err: any) {
      await addLines([
        ["", "blank"],
        [`  ❌ Error: ${err.message}`, "error"],
        ["", "blank"],
        ["  Type  dailaunch deploy  to try again.", "muted"],
        ["", "blank"],
      ], 60);
      setPhase("error");
    }
  };

  // ── Prompt label ─────────────────────────────────────────────────────────
  const promptLabel = () => {
    if (phase === "idle" || phase === "done" || phase === "error") {
      return user ? `[${user.githubLogin}] $ ` : "$ ";
    }
    return "> ";
  };

  const lineColor = (type: Line["type"]) => {
    switch (type) {
      case "cmd":     return "#a87fff";
      case "prompt":  return "#c4b5fd";
      case "info":    return "#e2e8f0";
      case "success": return "#00e5a0";
      case "error":   return "#ff4466";
      case "warn":    return "#f59e0b";
      case "muted":   return "#64748b";
      case "blank":   return "transparent";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05050f",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          background: "#0d0d1a",
          borderBottom: "1px solid #1e1e3a",
          userSelect: "none",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((col, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: col }} />
        ))}
        <span style={{ color: "#4a4a6a", fontSize: 12, marginLeft: 12 }}>
          dailaunch — web terminal — base mainnet
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {/* Status login di toolbar */}
          {user ? (
            <span style={{ fontSize: 11, color: "#00e5a0", background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.2)", padding: "2px 10px", borderRadius: 4 }}>
              @{user.githubLogin}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "#64748b", padding: "2px 10px" }}>
              not logged in
            </span>
          )}
          <div
            style={{
              width: 7, height: 7, borderRadius: "50%", background: "#00e5a0",
              boxShadow: "0 0 8px #00e5a0",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ color: "#00e5a0", fontSize: 11 }}>LIVE</span>
          <a
            href="/"
            style={{
              marginLeft: 16, color: "#6a32f0", fontSize: 11, textDecoration: "none",
              padding: "3px 10px", border: "1px solid #2d1a6e", borderRadius: 4,
            }}
          >
            ← Dashboard
          </a>
        </div>
      </div>

      {/* Terminal output */}
      <div style={{ flex: 1, padding: "20px 24px 8px", overflowY: "auto" }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              color: lineColor(line.type),
              fontSize: 13,
              lineHeight: "1.8",
              whiteSpace: "pre",
              letterSpacing: line.type === "info" ? "0.03em" : "0",
            }}
          >
            {line.text || "\u00a0"}
          </div>
        ))}

        {isTyping && (
          <div style={{ color: "#4a4a6a", fontSize: 13 }}>▋</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {phase !== "deploying" && phase !== "waiting_login" && (
        <div
          style={{
            padding: "12px 24px 20px",
            borderTop: "1px solid #0f0f2a",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#05050f",
          }}
        >
          <span style={{ color: "#6a32f0", fontSize: 14, userSelect: "none", flexShrink: 0 }}>
            {promptLabel()}
          </span>
          <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e2e8f0",
                fontFamily: "inherit",
                fontSize: 13,
                caretColor: "#6a32f0",
                letterSpacing: "0.02em",
              }}
              placeholder={
                phase === "idle" || phase === "done" || phase === "error"
                  ? "dailaunch deploy"
                  : phase === "confirm"
                  ? "y / n"
                  : "type your answer..."
              }
            />
          </form>
        </div>
      )}

      {/* Deploy links bar (shown when done) */}
      {phase === "done" && deployResult && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 24px 20px",
            borderTop: "1px solid #0f0f2a",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "🔍 BaseScan", href: deployResult.baseScan },
            { label: "📊 DexScreener", href: deployResult.dexScreener },
            deployResult.githubRepo ? { label: "🐙 GitHub Repo", href: deployResult.githubRepo } : null,
            { label: "← Dashboard", href: "/" },
          ]
            .filter(Boolean)
            .map((link: any) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={{
                  padding: "7px 14px",
                  background: "#0d0d1a",
                  border: "1px solid #1e1e3a",
                  borderRadius: 6,
                  color: "#a87fff",
                  textDecoration: "none",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6a32f0")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e3a")}
              >
                {link.label}
              </a>
            ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #05050f; }
        ::-webkit-scrollbar-thumb { background: #1e1e3a; border-radius: 2px; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        ::selection { background: #2d1a6e; }
      `}</style>
    </div>
  );
}
