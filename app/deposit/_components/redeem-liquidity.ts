import { formatUnits } from "viem";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import type { MainnetVaultLiquidityItem } from "@/lib/types/mainnet-vault-liquidity";
import { formatTokenAmount } from "./utils/format";

export type RedeemLiquidityPhase =
  | "idle"
  | "loading"
  | "ready"
  | "insufficient"
  | "unavailable";

export type RedeemLiquidityState = {
  phase: RedeemLiquidityPhase;
  selectedVault: MainnetVaultLiquidityItem | null;
  requestedAssets: bigint | null;
  availableAssets: bigint | null;
};

type Params = {
  enabled: boolean;
  isLoading: boolean;
  isUnavailable: boolean;
  selectedVault: MainnetVaultLiquidityItem | null;
  requestedAssets: bigint | null;
};

export const getRedeemLiquidityState = ({
  enabled,
  isLoading,
  isUnavailable,
  selectedVault,
  requestedAssets,
}: Params): RedeemLiquidityState => {
  if (!enabled) {
    return {
      phase: "idle",
      selectedVault: null,
      requestedAssets: null,
      availableAssets: null,
    };
  }

  if (isUnavailable) {
    return {
      phase: "unavailable",
      selectedVault,
      requestedAssets,
      availableAssets: selectedVault
        ? BigInt(selectedVault.availableAmountRaw)
        : null,
    };
  }

  if (isLoading) {
    return {
      phase: "loading",
      selectedVault,
      requestedAssets,
      availableAssets: selectedVault
        ? BigInt(selectedVault.availableAmountRaw)
        : null,
    };
  }

  if (!selectedVault) {
    return {
      phase: "unavailable",
      selectedVault: null,
      requestedAssets,
      availableAssets: null,
    };
  }

  const availableAssets = BigInt(selectedVault.availableAmountRaw);

  if (
    requestedAssets != null &&
    requestedAssets > BigInt(0) &&
    requestedAssets > availableAssets
  ) {
    return {
      phase: "insufficient",
      selectedVault,
      requestedAssets,
      availableAssets,
    };
  }

  return {
    phase: "ready",
    selectedVault,
    requestedAssets,
    availableAssets,
  };
};

export const formatVaultAvailability = (
  vault: Pick<MainnetVaultLiquidityItem, "availableAmountRaw" | "decimals">,
  precision = 2,
) =>
  formatTokenAmount(
    formatUnits(BigInt(vault.availableAmountRaw), vault.decimals),
    precision,
  );

export const sortLiquidityVaults = <
  TVault extends { ticker: StablecoinTicker },
>(
  vaults: TVault[],
  order: StablecoinTicker[],
) =>
  [...vaults].sort(
    (left, right) => order.indexOf(left.ticker) - order.indexOf(right.ticker),
  );
