#!/bin/bash
set -e

echo "⚡ DaiLaunch Setup Script"
echo "========================="

# Root
echo "📦 Installing root dependencies..."
pnpm install

# API
echo "📦 Installing API dependencies..."
cd packages/api
pnpm install
cd ../..

# CLI
echo "📦 Installing CLI dependencies..."
cd packages/cli
pnpm install
cd ../..

# Dashboard
echo "📦 Installing Dashboard dependencies..."
cd packages/dashboard
pnpm install
cd ../..

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "Next steps:"
echo "1. Copy packages/api/.env.example → packages/api/.env and fill in values"
echo "2. Copy packages/dashboard/.env.local.example → packages/dashboard/.env.local"
echo "3. Run DB migration: cd packages/api && npx prisma db push"
echo "4. Start API: cd packages/api && pnpm dev"
echo "5. Start Dashboard: cd packages/dashboard && pnpm dev"
