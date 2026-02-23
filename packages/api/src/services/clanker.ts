import { Clanker } from 'clanker-sdk/v4';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// ─── Fee Configuration ────────────────────────────────────────────────────────
//
//  Clanker SDK menggunakan basis points (bps) untuk reward:
//    10000 bps = 100%
//
//  Pembagian trading fee setiap swap:
//    ┌─────────────────────────────────────────────────────┐
//    │  90% (9000 bps) → Creator Wallet (deployer token)  │
//    │  10% (1000 bps) → DaiLaunch Platform Wallet        │
//    └─────────────────────────────────────────────────────┘
//
//  Catatan: Clanker protocol juga mengambil fee tersendiri
//  (protocol fee) yang sudah otomatis dipotong sebelum
//  reward creator/platform dibagikan.
//
// ─────────────────────────────────────────────────────────────────────────────

const CREATOR_REWARD_PERCENT  = 90; // 90% trading fee → creator wallet
const PLATFORM_REWARD_PERCENT = 10; // 10% trading fee → DaiLaunch platform

const account = privateKeyToAccount(
  process.env.PLATFORM_PRIVATE_KEY as `0x${string}`
);

const publicClient = createPublicClient({
  chain:     base,
  transport: http(process.env.BASE_RPC_URL),
});

const wallet = createWalletClient({
  account,
  chain:     base,
  transport: http(process.env.BASE_RPC_URL),
});

const clanker = new Clanker({ publicClient: publicClient as any, wallet });

export interface DeployParams {
  name:         string;
  symbol:       string;
  creatorWallet: string;
  twitter?:     string;
  website?:     string;
  githubUser:   string;
}

export interface DeployResult {
  contractAddress: string;
  txHash:          string;
}

export async function deployTokenViaClanker(params: DeployParams): Promise<DeployResult> {
  const socialUrls: { platform: string; url: string }[] = [];
  if (params.twitter) socialUrls.push({ platform: 'twitter', url: params.twitter });
  if (params.website) socialUrls.push({ platform: 'web',     url: params.website });

  const deployParams: any = {
    name:       params.name,
    symbol:     params.symbol,
    tokenAdmin: account.address,
    image:      'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    metadata: {
      description:    `Token deployed via DaiLaunch by @${params.githubUser}`,
      socialMediaUrls: socialUrls,
      auditUrls:      [],
    },
    context: {
      interface: 'DaiLaunch',
      platform:  'github',
      messageId: '',
      id:        params.githubUser,
    },

    // ── Fee Split ──────────────────────────────────────────────────────────
    // creatorReward: 90 → 90% setiap trading fee ke creator wallet
    // Sisa 10%         → otomatis ke interfaceRewardRecipient (DaiLaunch)
    rewardsConfig: {
      creatorReward:            CREATOR_REWARD_PERCENT,
      creatorAdmin:             params.creatorWallet as `0x${string}`,
      creatorRewardRecipient:   params.creatorWallet as `0x${string}`,
      interfaceAdmin:           process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`,
      interfaceRewardRecipient: process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`,
    },
    // ──────────────────────────────────────────────────────────────────────
  };

  const { txHash, waitForTransaction, error } = await clanker.deploy(deployParams);

  if (error) throw new Error(`Clanker deploy failed: ${error.message}`);

  const { address } = await waitForTransaction();

  return {
    contractAddress: address,
    txHash,
  };
}
