<div align="center">

# ⚡ DaiLaunch

**Token Launchpad on Base Chain**

Deploy an ERC-20 token to Base blockchain in under 2 minutes — all you need is a terminal and a GitHub account.

[![Base Chain](https://img.shields.io/badge/Chain-Base-0052FF)](https://base.org)
[![Powered by Clanker](https://img.shields.io/badge/Powered%20by-Clanker%20SDK%20v4-purple)](https://github.com/clanker-devco)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/dailaunch-bot/dailaunch-)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Website](https://dailaunch.online) · [Dashboard](https://dailaunch.online/dashboard) · [BaseScan](https://basescan.org)

</div>

---

## 📖 Introduction

DaiLaunch is an **open-source token launchpad** built on Base chain with a CLI-first approach. It lets developers and creators deploy ERC-20 tokens to the blockchain in just a few commands — no wallet setup required, no complex configuration.

### How It Works

```
User → dailaunch deploy → GitHub Auth → Clanker SDK → Base Mainnet
                               ↓
                   Auto-generate Creator Wallet
                               ↓
                   Auto-create GitHub Repo (metadata)
                               ↓
             Token live on DexScreener & BaseScan
```

### Fee Structure

Every deployed token earns **permanent trading fees** from every swap:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trading Fee per Swap                         │
│                                                                 │
│   90% ──────────────────────→  Creator Wallet (deployer)        │
│   10% ──────────────────────→  DaiLaunch Platform Wallet        │
└─────────────────────────────────────────────────────────────────┘

* Clanker protocol fee is deducted automatically before the split above
```

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🚀 **Deploy ERC-20** | Deploy tokens to Base Mainnet via Clanker SDK v4 |
| 🔐 **GitHub Auth** | Authenticate via GitHub — no manual wallet setup needed |
| 👛 **Auto Wallet** | Creator wallet is auto-generated and AES-256 encrypted |
| 📁 **Auto GitHub Repo** | Every token gets a repo with `token-info.json` + README |
| 💰 **90% Fee to Creator** | 90% of every trading fee flows directly to the creator wallet |
| 📊 **Real-time Indexing** | Instantly appears on DexScreener & BaseScan |
| 🌐 **Web Dashboard** | Track all tokens at [dailaunch.online](https://dailaunch.online) |
| 🧪 **Testnet Mode** | Simulate deployment with no real transactions (`--testnet`) |

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
│   │       ├── index.ts            # API server entry point
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
│   │       ├── index.ts            # CLI entry point
│   │       ├── commands/
│   │       │   ├── deploy.ts       # dailaunch deploy
│   │       │   ├── status.ts       # dailaunch status
│   │       │   ├── claim.ts        # dailaunch claim
│   │       │   └── exportkey.ts    # dailaunch exportkey
│   │       └── lib/
│   │           ├── api.ts          # HTTP client to API
│   │           └── github.ts       # GitHub token helper
│   │
│   └── dashboard/                  # Web Dashboard — Next.js
│       └── src/
│           ├── app/
│           │   ├── page.tsx        # Main token list page
│           │   └── token/[address] # Token detail page
│           └── components/
│               ├── DashboardClient.tsx
│               └── TokenDetailClient.tsx
│
├── claim.js                        # Creator fee claim script
├── setup.sh                        # Setup script (Linux/macOS)
├── railway.toml                    # Railway deployment config
└── README.md
```

---

## 🗄 Database Schema

DaiLaunch uses **PostgreSQL** with **Prisma ORM**.

### Model: `User`

Created automatically on first deploy. Wallet is generated and encrypted — users never need to manage keys manually.

```prisma
model User {
  id             String   @id @default(cuid())
  githubUsername String   @unique   // GitHub login username
  walletAddress  String   @unique   // Creator wallet (auto-generated)
  encryptedKey   String             // Private key (AES-256 encrypted)
  createdAt      DateTime @default(now())
}
```

### Model: `Token`

Every successfully deployed token is fully recorded on-chain and in the database.

```prisma
model Token {
  id              String   @id @default(cuid())
  contractAddress String   @unique   // ERC-20 contract address on Base
  name            String             // Token name
  symbol          String             // Ticker symbol (max 10 chars)
  deployer        String             // GitHub username of deployer
  creatorWallet   String             // Wallet receiving 90% trading fees
  githubRepo      String   @default("")
  twitter         String?
  website         String?
  txHash          String             // Deploy transaction hash
  deployedAt      DateTime @default(now())

  // Market data — updated in real-time by indexer
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

Every deploy automatically creates a GitHub repo with the following files:

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

## 🚀 Installation & Quick Start

### Prerequisites

- **Node.js** v18+
- **GitHub CLI** (`gh`) — for authentication
- **Git**

### Step 1 — Login to GitHub

```bash
gh auth login
```

Select: **GitHub.com** → **HTTPS** → **Login with a web browser**

### Step 2 — Clone the Repository

```bash
git clone https://github.com/dailaunch-bot/dailaunch-
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

**Or use the setup script (Linux/macOS):**
```bash
chmod +x setup.sh && ./setup.sh
```

### Step 4 — Verify Installation

```bash
dailaunch --version
# 1.0.0

dailaunch --help
```

---

## 🛠 CLI Commands

### `dailaunch deploy`

Interactively deploy a new ERC-20 token to Base Mainnet.

```bash
dailaunch deploy
```

You will be prompted to fill in:
- **Token Name** — full name of the token
- **Ticker Symbol** — max 10 characters
- **Twitter/X URL** — optional
- **Website URL** — optional
- **Logo URL** — optional

**Testnet mode (simulation, no real transactions):**
```bash
dailaunch deploy --testnet
```

**Example output after a successful deploy:**
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

  💰 90% of all trading fees go to your creator wallet (10% to DaiLaunch platform)
  📊 Run: dailaunch claim — to check your fee balance
```

---

### `dailaunch status`

View platform statistics and the latest deployed tokens.

```bash
dailaunch status
```

```
⚡ DaiLaunch Platform Stats

  Total Tokens  : 142
  Today         : +7 tokens
  Total Volume  : $1.24M

  Latest Tokens:
  • DGRKT    DaiGecko Token      +42.5%
  • BFROG    Base Frog            -8.3%
  • GHSTR    GitHub Star         +15.7%
```

---

### `dailaunch claim`

Check the accumulated trading fee balance in your creator wallet.

```bash
dailaunch claim
```

---

### `dailaunch exportkey`

Export your creator wallet private key (use with extreme caution).

```bash
dailaunch exportkey
```

> ⚠️ **Warning:** Never share your private key with anyone.

---

## 📄 License

MIT License — see the [LICENSE](LICENSE) file for full details.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

<div align="center">

**⚡ DaiLaunch** · [dailaunch.online](https://dailaunch.online) · [github.com/dailaunch-bot/dailaunch](https://github.com/dailaunch-bot/dailaunch-)

*Token Launchpad on Base · Powered by Clanker SDK v4*

</div>
