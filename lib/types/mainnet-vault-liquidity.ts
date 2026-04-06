import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import type { HexAddress } from "@/lib/types/address";

export type MainnetVaultLiquidityItem = {
  ticker: StablecoinTicker;
  tokenAddress: HexAddress;
  vaultAddress: HexAddress;
  decimals: number;
  availableAmountRaw: string;
  availableFormatted: string;
  normalizedAmountRaw: string;
};

export type MainnetVaultLiquidityResponse = {
  updatedAt: string;
  vaults: MainnetVaultLiquidityItem[];
};
