<div align="center">

# ⚡ DaiLaunch

**Token Launchpad on Base Chain**

Deploy token ERC-20 ke Base blockchain dalam waktu < 2 menit — hanya butuh terminal & akun GitHub.

[![Base Chain](https://img.shields.io/badge/Chain-Base-0052FF)](https://base.org)
[![Powered by Clanker](https://img.shields.io/badge/Powered%20by-Clanker%20SDK%20v4-purple)](https://github.com/clanker-devco)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/dailaunch-bot/dailaunch)

[Website](https://dailaunch.online) · [Dashboard](https://dailaunch.online/dashboard) · [BaseScan](https://basescan.org)

</div>

---

## 📖 Pengenalan

DaiLaunch adalah **open-source token launchpad** berbasis CLI untuk Base chain. Platform ini memungkinkan developer dan kreator men-deploy token ERC-20 ke blockchain hanya dengan beberapa perintah di terminal — tanpa setup wallet yang rumit, tanpa konfigurasi teknis yang panjang.

### Cara Kerja

```
User → dailaunch deploy → GitHub Auth → Clanker SDK → Base Mainnet
                              ↓
                    Auto-generate Creator Wallet
                              ↓
                    Auto-buat GitHub Repo (metadata)
                              ↓
              Token live di DexScreener & BaseScan
```

### Fee Structure

Setiap token yang di-deploy mendapat **trading fee permanen** dari setiap swap:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trading Fee per Swap                         │
│                                                                 │
│   90% ──────────────────────→  Creator Wallet (deployer)        │
│   10% ──────────────────────→  DaiLaunch Platform Wallet        │
└─────────────────────────────────────────────────────────────────┘

* Clanker protocol fee dipotong otomatis sebelum pembagian di atas
```

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🚀 **Deploy ERC-20** | Deploy token ke Base Mainnet via Clanker SDK v4 |
| 🔐 **GitHub Auth** | Autentikasi via GitHub — tidak perlu setup wallet manual |
| 👛 **Auto Wallet** | Creator wallet di-generate & dienkripsi AES-256 otomatis |
| 📁 **Auto GitHub Repo** | Setiap token mendapat repo dengan `token-info.json` + README |
| 💰 **90% Fee ke Creator** | 90% dari setiap trading fee mengalir ke creator wallet |
| 📊 **Real-time Indexing** | Langsung muncul di DexScreener & BaseScan |
| 🌐 **Web Dashboard** | Pantau semua token di [dailaunch.online](https://dailaunch.online) |
| 🧪 **Testnet Mode** | Simulasi deploy tanpa transaksi nyata (`--testnet`) |

---

## 🗂 Project Structure

```
dailaunch/
├── packages/
│   ├── api/                        # Backend API — Express + TypeScript
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema (PostgreSQL)
│   │   │   └── migrations/         # Prisma migrations
│   │   └── src/
│   │       ├── index.ts            # Entry point API server
│   │       ├── middleware/
│   │       │   └── auth.ts         # GitHub token verification
│   │       ├── routes/
│   │       │   ├── deploy.ts       # POST /api/deploy
│   │       │   ├── tokens.ts       # GET  /api/tokens
│   │       │   ├── stats.ts        # GET  /api/stats
│   │       │   └── user.ts         # GET  /api/user
│   │       └── services/
│   │           ├── clanker.ts      # Clanker SDK deploy + fee config
│   │           ├── github.ts       # Auto-create GitHub repo per token
│   │           ├── indexer.ts      # Real-time price & market indexer
│   │           └── wallet.ts       # Generate & encrypt creator wallet
│   │
│   ├── cli/                        # CLI Tool — npm package: dailaunch
│   │   └── src/
│   │       ├── index.ts            # Entry point CLI
│   │       ├── commands/
│   │       │   ├── deploy.ts       # dailaunch deploy
│   │       │   ├── status.ts       # dailaunch status
│   │       │   ├── claim.ts        # dailaunch claim
│   │       │   └── exportkey.ts    # dailaunch exportkey
│   │       └── lib/
│   │           ├── api.ts          # HTTP client ke API
│   │           └── github.ts       # GitHub token helper
│   │
│   └── dashboard/                  # Web Dashboard — Next.js
│       └── src/
│           ├── app/
│           │   ├── page.tsx        # Halaman utama token list
│           │   └── token/[address] # Halaman detail token
│           └── components/
│               ├── DashboardClient.tsx
│               └── TokenDetailClient.tsx
│
├── claim.js                        # Script claim fee creator
├── setup.sh                        # Setup script (Linux/macOS)
├── railway.toml                    # Railway deployment config
└── README.md
```

---

## 🗄 Database Schema

DaiLaunch menggunakan **PostgreSQL** dengan **Prisma ORM**.

### Model: `User`

Dibuat otomatis saat user pertama kali deploy. Wallet di-generate dan dienkripsi — user tidak perlu setup wallet manual.

```prisma
model User {
  id             String   @id @default(cuid())
  githubUsername String   @unique   // Login GitHub user
  walletAddress  String   @unique   // Creator wallet (auto-generated)
  encryptedKey   String             // Private key (AES-256 encrypted)
  createdAt      DateTime @default(now())
}
```

### Model: `Token`

Setiap token yang berhasil di-deploy dicatat lengkap.

```prisma
model Token {
  id              String   @id @default(cuid())
  contractAddress String   @unique   // Alamat contract ERC-20 di Base
  name            String             // Nama token
  symbol          String             // Ticker (max 10 karakter)
  deployer        String             // GitHub username deployer
  creatorWallet   String             // Wallet penerima 90% trading fee
  githubRepo      String   @default("")
  twitter         String?
  website         String?
  txHash          String             // Transaction hash deploy
  deployedAt      DateTime @default(now())

  // Market data (diupdate oleh indexer secara real-time)
  tradeVolume    Float @default(0)
  price          Float @default(0)
  marketCap      Float @default(0)
  liquidity      Float @default(0)
  holders        Int   @default(0)
  priceChange24h Float @default(0)

  @@index([deployedAt])
  @@index([deployer])
  @@index([marketCap])
  @@index([tradeVolume])
}
```

### GitHub Repo per Token — `token-info.json`

Setiap deploy otomatis membuat GitHub repo dengan file berikut:

```json
{
  "name": "MyToken",
  "symbol": "MTK",
  "contractAddress": "0xabc...def",
  "creatorFeeWallet": "0x123...456",
  "chain": "base",
  "chainId": 8453,
  "social": {
    "twitter": "https://twitter.com/mytoken",
    "website": "https://mytoken.xyz",
    "logo": "https://..."
  },
  "deployedBy": "github-username",
  "deployTxHash": "0xfed...cba",
  "deployedAt": "2026-02-23T00:00:00.000Z",
  "platform": "DaiLaunch",
  "baseScan": "https://basescan.org/token/0xabc...def",
  "dexScreener": "https://dexscreener.com/base/0xabc...def"
}
```

---

## 🚀 Instalasi & Quick Start

### Prasyarat

- **Node.js** v18+
- **GitHub CLI** (`gh`) — untuk autentikasi
- **Git**

### Step 1 — Login GitHub

```bash
gh auth login
```

Pilih: **GitHub.com** → **HTTPS** → **Login with a web browser**

### Step 2 — Clone Repository

```bash
git clone https://github.com/dailaunch-bot/dailaunch
cd dailaunch
```

### Step 3 — Build & Install CLI

**Windows (PowerShell):**
```powershell
npm install
npm run build:all
npm install -g .\packages\cli
```

**Linux / macOS:**
```bash
npm install && npm run build:all && npm install -g ./packages/cli
```

**Atau gunakan setup script (Linux/macOS):**
```bash
chmod +x setup.sh && ./setup.sh
```

### Step 4 — Verifikasi Instalasi

```bash
dailaunch --version
# 1.0.0

dailaunch --help
```

---

## 🛠 CLI Commands

### `dailaunch deploy`

Deploy token ERC-20 baru ke Base Mainnet secara interaktif.

```bash
dailaunch deploy
```

Akan ada prompt untuk mengisi:
- **Token Name** — nama lengkap token
- **Ticker Symbol** — max 10 karakter
- **Twitter/X URL** — opsional
- **Website URL** — opsional
- **Logo URL** — opsional

**Mode Testnet (simulasi, tidak ada transaksi nyata):**
```bash
dailaunch deploy --testnet
```

**Contoh output setelah deploy berhasil:**
```
✅ Deployment Complete!

  Token Name    : My Awesome Token
  Symbol        : MAT
  Contract      : 0xabc...def
  Creator Wallet: 0x123...456
  GitHub Repo   : https://github.com/username/dailaunch-mat-1234567890
  TX Hash       : 0xfed...cba
  BaseScan      : https://basescan.org/token/0xabc...def
  DexScreener   : https://dexscreener.com/base/0xabc...def

  💰 90% of all trading fees go to your creator wallet
  📊 Run: dailaunch claim — to check your fee balance
```

---

### `dailaunch status`

Lihat statistik platform dan token terbaru.

```bash
dailaunch status
```

---

### `dailaunch claim`

Cek saldo trading fee yang terkumpul di creator wallet.

```bash
dailaunch claim
```

---

### `dailaunch exportkey`

Export private key creator wallet (gunakan dengan hati-hati).

```bash
dailaunch exportkey
```

> ⚠️ Jangan pernah share private key ke siapapun.

---

## 🌐 Environment Variables

Buat file `packages/api/.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dailaunch"

# Platform wallet DaiLaunch (penerima 10% trading fee)
PLATFORM_WALLET_ADDRESS="0xYOUR_PLATFORM_WALLET"
PLATFORM_PRIVATE_KEY="0xYOUR_PLATFORM_PRIVATE_KEY"

# Base RPC
BASE_RPC_URL="https://mainnet.base.org"

# Enkripsi private key creator
ENCRYPT_SALT="your-random-secret-salt"

# CORS
DASHBOARD_URL="https://dailaunch.online"

# Port (default: 3001)
PORT=3001
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/health` | — | Health check |
| `GET` | `/api/stats` | — | Platform statistics |
| `GET` | `/api/tokens` | — | List token (sort, search, pagination) |
| `GET` | `/api/tokens/:address` | — | Detail satu token |
| `POST` | `/api/deploy` | ✅ | Deploy token baru |
| `GET` | `/api/user/me` | ✅ | Info user & wallet |

Auth menggunakan header: `x-github-token: YOUR_GITHUB_TOKEN`

---

## 🧪 Testnet Mode

Test tanpa transaksi nyata:

```bash
# Jalankan mock API (tidak perlu database)
node mock-api-server.js

# Test via CLI
node testnet-cli.js deploy
node testnet-cli.js status
node testnet-cli.js tokens
```

---

## 🏗 Deploy ke Railway

1. Fork repo ini
2. Buka [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Pilih repo hasil fork
4. Set semua environment variables
5. Railway otomatis deploy dan kasih URL publik

---

<div align="center">

**⚡ DaiLaunch** · [dailaunch.online](https://dailaunch.online) · [github.com/dailaunch-bot/dailaunch](https://github.com/dailaunch-bot/dailaunch)

*Token Launchpad on Base · Powered by Clanker SDK v4*

</div>
