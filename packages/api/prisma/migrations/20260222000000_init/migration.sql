-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "deployer" TEXT NOT NULL,
    "creatorWallet" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL DEFAULT '',
    "twitter" TEXT,
    "website" TEXT,
    "txHash" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tradeVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketCap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liquidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "holders" INTEGER NOT NULL DEFAULT 0,
    "priceChange24h" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_contractAddress_key" ON "Token"("contractAddress");

-- CreateIndex
CREATE INDEX "Token_deployedAt_idx" ON "Token"("deployedAt");

-- CreateIndex
CREATE INDEX "Token_deployer_idx" ON "Token"("deployer");

-- CreateIndex
CREATE INDEX "Token_marketCap_idx" ON "Token"("marketCap");

-- CreateIndex
CREATE INDEX "Token_tradeVolume_idx" ON "Token"("tradeVolume");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubUsername_key" ON "User"("githubUsername");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
