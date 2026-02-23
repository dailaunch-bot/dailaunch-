# 🗄 Database Schema

DaiLaunch uses **PostgreSQL** with **Prisma ORM**.

## Model: `User`

Created automatically on a user's first deploy. The wallet is generated and encrypted — users never need to manage keys manually.

```prisma
model User {
  id             String   @id @default(cuid())
  githubUsername String   @unique   // GitHub login username
  walletAddress  String   @unique   // Creator wallet (auto-generated)
  encryptedKey   String             // Private key (AES-256 encrypted)
  createdAt      DateTime @default(now())
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique record ID (CUID) |
| `githubUsername` | String | GitHub login of the deployer |
| `walletAddress` | String | Auto-generated EVM wallet address |
| `encryptedKey` | String | AES-256 encrypted private key |
| `createdAt` | DateTime | Account creation timestamp |

## Model: `Token`

Every successfully deployed token is fully recorded.

```prisma
model Token {
  id              String   @id @default(cuid())
  contractAddress String   @unique
  name            String
  symbol          String
  deployer        String
  creatorWallet   String
  githubRepo      String   @default("")
  twitter         String?
  website         String?
  txHash          String
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

| Field | Type | Description |
|-------|------|-------------|
| `contractAddress` | String | ERC-20 contract address on Base |
| `name` | String | Full token name |
| `symbol` | String | Ticker symbol (max 10 chars) |
| `deployer` | String | GitHub username of deployer |
| `creatorWallet` | String | Wallet receiving 90% trading fees |
| `githubRepo` | String | Auto-created GitHub repo URL |
| `txHash` | String | Deploy transaction hash |
| `tradeVolume` | Float | Cumulative trading volume (USD) |
| `price` | Float | Current token price (USD) |
| `marketCap` | Float | Current market cap (USD) |
| `liquidity` | Float | Current pool liquidity (USD) |
| `holders` | Int | Number of unique holders |
| `priceChange24h` | Float | 24-hour price change (%) |

{% hint style="info" %}
Market data fields (`price`, `marketCap`, `tradeVolume`, `holders`, `priceChange24h`) are updated automatically by the **indexer service** which polls DexScreener in real-time.
{% endhint %}
