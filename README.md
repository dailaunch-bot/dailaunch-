# ⚡ DaiLaunch

Token Launchpad on Base chain · Powered by Clanker SDK · GitHub Integration

## Quick Start

```bash
# 1. Clone & setup
git clone https://github.com/YOUR_USERNAME/dailaunch.git
cd dailaunch
chmod +x setup.sh && ./setup.sh

# 2. Setup environment variables
cp packages/api/.env.example packages/api/.env
# Edit packages/api/.env dengan nilai yang sesuai

cp packages/dashboard/.env.local.example packages/dashboard/.env.local
# Edit packages/dashboard/.env.local

# 3. Push database schema
cd packages/api
npx prisma db push

# 4. Jalankan lokal
# Terminal 1:
cd packages/api && pnpm dev

# Terminal 2:
cd packages/dashboard && pnpm dev
```

## Structure

```
dailaunch/
├── packages/
│   ├── api/          # Express API + Clanker SDK
│   ├── cli/          # npm package: dailaunch
│   └── dashboard/    # Next.js dashboard
├── setup.sh
└── pnpm-workspace.yaml
```

## Deploy

```bash
# API → Railway
cd packages/api
railway up

# Dashboard → Vercel
cd packages/dashboard
vercel deploy --prod

# CLI → npm
cd packages/cli
npm publish --access public
```

## Stack

- **Deploy Engine**: Clanker SDK v4 (Base chain)
- **Backend**: Express + Prisma + PostgreSQL
- **Dashboard**: Next.js 14 + Tailwind
- **CLI**: Node.js + Commander.js
- **Hosting**: Railway (API) + Vercel (Dashboard)
- **Auth**: GitHub CLI (gh auth)
