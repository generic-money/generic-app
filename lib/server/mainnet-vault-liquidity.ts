import "server-only";

import { createPublicClient, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";
import { CHAINS } from "@/lib/constants/chains";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import { getStablecoins } from "@/lib/models/tokens";
import type { HexAddress } from "@/lib/types/address";
import type {
  MainnetVaultLiquidityItem,
  MainnetVaultLiquidityResponse,
} from "@/lib/types/mainnet-vault-liquidity";

const FALLBACK_RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
];
const RPC_URLS = Array.from(
  new Set(
    [process.env.MAINNET_RPC_URL, ...FALLBACK_RPC_URLS].filter(
      (url): url is string => Boolean(url),
    ),
  ),
);

const mainnetVaults = getStablecoins(CHAINS.MAINNET).map((stablecoin) => ({
  ticker: stablecoin.ticker,
  tokenAddress: stablecoin.tokenAddress as HexAddress,
  vaultAddress: stablecoin.depositVaultAddress as HexAddress,
})) satisfies Array<{
  ticker: StablecoinTicker;
  tokenAddress: HexAddress;
  vaultAddress: HexAddress;
}>;

const vaultAbi = [
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const erc20DecimalsAbi = [
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

export type MainnetVaultLiquiditySnapshotItem = {
  ticker: StablecoinTicker;
  tokenAddress: HexAddress;
  vaultAddress: HexAddress;
  decimals: number;
  availableAmount: bigint;
  normalizedAmount: bigint;
};

export type MainnetVaultLiquiditySnapshot = {
  updatedAt: Date;
  vaults: MainnetVaultLiquiditySnapshotItem[];
};

export const readWithMainnetRpcFallback = async <T>(
  reader: (url: string) => Promise<T>,
): Promise<T> => {
  if (!RPC_URLS.length) {
    throw new Error("MAINNET_RPC_URL is not configured");
  }

  let lastError: unknown;

  for (const url of RPC_URLS) {
    try {
      return await reader(url);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unable to read from configured RPC URLs");
};

export const readMainnetVaultLiquiditySnapshot =
  async (): Promise<MainnetVaultLiquiditySnapshot> => {
    const vaults = await readWithMainnetRpcFallback(async (url) => {
      const client = createPublicClient({
        chain: mainnet,
        transport: http(url),
      });

      return Promise.all(
        mainnetVaults.map(async (vault) => {
          const asset = (await client.readContract({
            address: vault.vaultAddress,
            abi: vaultAbi,
            functionName: "asset",
          })) as HexAddress;
          const decimals = await client.readContract({
            address: asset,
            abi: erc20DecimalsAbi,
            functionName: "decimals",
          });
          const availableAmount = await client.readContract({
            address: vault.vaultAddress,
            abi: vaultAbi,
            functionName: "totalAssets",
          });

          const scale = BigInt(10) ** BigInt(18 - Number(decimals));

          return {
            ticker: vault.ticker,
            tokenAddress: asset,
            vaultAddress: vault.vaultAddress,
            decimals: Number(decimals),
            availableAmount,
            normalizedAmount: availableAmount * scale,
          };
        }),
      );
    });

    return {
      updatedAt: new Date(),
      vaults,
    };
  };

export const serializeMainnetVaultLiquidity = (
  snapshot: MainnetVaultLiquiditySnapshot,
): MainnetVaultLiquidityResponse => ({
  updatedAt: snapshot.updatedAt.toISOString(),
  vaults: snapshot.vaults.map(
    (vault): MainnetVaultLiquidityItem => ({
      ticker: vault.ticker,
      tokenAddress: vault.tokenAddress,
      vaultAddress: vault.vaultAddress,
      decimals: vault.decimals,
      availableAmountRaw: vault.availableAmount.toString(),
      availableFormatted: formatUnits(vault.availableAmount, vault.decimals),
      normalizedAmountRaw: vault.normalizedAmount.toString(),
    }),
  ),
});
