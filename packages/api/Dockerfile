FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN cat > src/services/clanker.ts << 'EOF'
import { Clanker } from 'clanker-sdk/v4';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const account = privateKeyToAccount(
  process.env.PLATFORM_PRIVATE_KEY as `0x${string}`
);
const publicClient = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL) });
const wallet = createWalletClient({ account, chain: base, transport: http(process.env.BASE_RPC_URL) });
const clanker = new Clanker({ publicClient: publicClient as any, wallet });

export interface DeployParams { name: string; symbol: string; creatorWallet: string; twitter?: string; website?: string; githubUser: string; }
export interface DeployResult { contractAddress: string; txHash: string; }

export async function deployTokenViaClanker(params: DeployParams): Promise<DeployResult> {
  const socialUrls: { platform: string; url: string }[] = [];
  if (params.twitter) socialUrls.push({ platform: 'twitter', url: params.twitter });
  if (params.website) socialUrls.push({ platform: 'web', url: params.website });
  const { txHash, waitForTransaction, error } = await clanker.deploy({
    name: params.name, symbol: params.symbol, tokenAdmin: account.address,
    image: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    metadata: { description: `Token deployed via DaiLaunch by @${params.githubUser}`, socialMediaUrls: socialUrls, auditUrls: [] },
    context: { interface: 'DaiLaunch', platform: 'github', messageId: '', id: params.githubUser },
    rewardsConfig: { creatorReward: 80, creatorAdmin: params.creatorWallet as `0x${string}`, creatorRewardRecipient: params.creatorWallet as `0x${string}`, interfaceAdmin: process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`, interfaceRewardRecipient: process.env.PLATFORM_WALLET_ADDRESS as `0x${string}` },
  });
  if (error) throw new Error(`Clanker deploy failed: ${error.message}`);
  const { address } = await waitForTransaction();
  return { contractAddress: address, txHash };
}
EOF
RUN npx prisma generate
RUN npx tsc --skipLibCheck --module Node16 --moduleResolution Node16 --target ES2022 --lib ES2022,DOM,DOM.Iterable --outDir ./dist --esModuleInterop --resolveJsonModule
EXPOSE 3001
CMD ["node", "dist/index.js"]
