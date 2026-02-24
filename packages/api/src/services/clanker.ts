import { Clanker } from 'clanker-sdk/v4';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const CREATOR_BPS  = 7_500; // 75% of 80% remaining = 60% of total swap fee
const PLATFORM_BPS = 2_500; // 25% of 80% remaining = 20% of total swap fee

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

  console.log('[DaiLaunch] Deploy params:', JSON.stringify(deployParams, null, 2));

  let txHash: string;
  let waitForTransaction: any;
  let error: any;

  try {
    const result = await clanker.deploy(deployParams);
    txHash             = result.txHash;
    waitForTransaction = result.waitForTransaction;
    error              = result.error;
  } catch (deployErr: any) {
    console.error('[DaiLaunch] clanker.deploy() threw exception:', deployErr);
    console.error('[DaiLaunch] Full error:', JSON.stringify(deployErr, Object.getOwnPropertyNames(deployErr)));
    throw new Error(`Clanker deploy exception: ${deployErr?.message || JSON.stringify(deployErr)}`);
  }

  if (error) {
    console.error('[DaiLaunch] Clanker error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw new Error(`Clanker deploy failed: ${error?.message || JSON.stringify(error)}`);
  }

  const { address } = await waitForTransaction();

  return {
    contractAddress: address,
    txHash,
  };
}
