import { Clanker } from 'clanker-sdk/v4';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const CREATOR_BPS  = 9_000; // 90%
const PLATFORM_BPS = 1_000; // 10%

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
  name:          string;
  symbol:        string;
  creatorWallet: string;
  twitter?:      string;
  website?:      string;
  githubUser:    string;
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
      description:     `Token deployed via DaiLaunch by @${params.githubUser}`,
      socialMediaUrls: socialUrls,
      auditUrls:       [],
    },
    context: {
      interface: 'DaiLaunch',
      platform:  'github',
      messageId: '',
      id:        params.githubUser,
    },
    rewards: {
      recipients: [
        {
          recipient: params.creatorWallet as `0x${string}`,
          admin:     params.creatorWallet as `0x${string}`,
          bps:       CREATOR_BPS,
          token:     'Paired',
        },
        {
          recipient: process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`,
          admin:     process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`,
          bps:       PLATFORM_BPS,
          token:     'Paired',
        },
      ],
    },
  };

  const { txHash, waitForTransaction, error } = await clanker.deploy(deployParams);

  if (error) throw new Error(`Clanker deploy failed: ${error.message}`);

  const { address } = await waitForTransaction();

  return {
    contractAddress: address,
    txHash,
  };
}
