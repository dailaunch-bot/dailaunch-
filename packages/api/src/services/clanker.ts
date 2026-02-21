import { Clanker } from 'clanker-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// ── Platform wallet setup ─────────────────────────────────────────────────────
const account = privateKeyToAccount(
  process.env.PLATFORM_PRIVATE_KEY as `0x${string}`
);

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL),
});

const wallet = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL),
});

const clanker = new Clanker({ publicClient, wallet });

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DeployParams {
  name: string;
  symbol: string;
  creatorWallet: string;
  twitter?: string;
  website?: string;
  githubUser: string;
}

export interface DeployResult {
  contractAddress: string;
  txHash: string;
}

// ── Deploy token via Clanker SDK ─────────────────────────────────────────────
export async function deployTokenViaClanker(params: DeployParams): Promise<DeployResult> {
  const socialUrls: string[] = [];
  if (params.twitter) socialUrls.push(params.twitter);
  if (params.website) socialUrls.push(params.website);

  const { txHash, waitForTransaction, error } = await clanker.deploy({
    name: params.name,
    symbol: params.symbol,
    tokenAdmin: account.address,

    // Image wajib ada
    image: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',

    metadata: {
      description: `Token deployed via DaiLaunch by @${params.githubUser}`,
      socialMediaUrls: socialUrls,
      auditUrls: [],
    },

    context: {
      interface: 'DaiLaunch',
      platform: 'github',
      messageId: '',
      id: params.githubUser,
    },

    // ── Fee: 80% creator, 20% DaiLaunch ──────────────────────────────────────
    rewardsConfig: {
      creatorReward: 80,
      creatorAdmin: params.creatorWallet as `0x${string}`,
      creatorRewardRecipient: params.creatorWallet as `0x${string}`,
      interfaceAdmin: process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`,
      interfaceRewardRecipient: process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`,
    },
  });

  if (error) throw new Error(`Clanker deploy failed: ${error.message}`);

  const { address } = await waitForTransaction();

  return {
    contractAddress: address,
    txHash,
  };
}
