import {
  formatVaultAvailability,
  getRedeemLiquidityState,
  sortLiquidityVaults,
} from "./redeem-liquidity";

const usdcVault = {
  ticker: "USDC" as const,
  tokenAddress: "0x0000000000000000000000000000000000000001" as const,
  vaultAddress: "0x0000000000000000000000000000000000000011" as const,
  decimals: 6,
  availableAmountRaw: "10000000",
  availableFormatted: "10",
  normalizedAmountRaw: "10000000000000000000",
};

const usdtVault = {
  ticker: "USDT" as const,
  tokenAddress: "0x0000000000000000000000000000000000000002" as const,
  vaultAddress: "0x0000000000000000000000000000000000000022" as const,
  decimals: 6,
  availableAmountRaw: "5000000",
  availableFormatted: "5",
  normalizedAmountRaw: "5000000000000000000",
};

test("returns idle when liquidity guard is disabled", () => {
  expect(
    getRedeemLiquidityState({
      enabled: false,
      isLoading: false,
      isUnavailable: false,
      selectedVault: usdcVault,
      requestedAssets: BigInt(1),
    }),
  ).toEqual({
    phase: "idle",
    selectedVault: null,
    requestedAssets: null,
    availableAssets: null,
  });
});

test("returns insufficient when requested assets exceed selected vault liquidity", () => {
  expect(
    getRedeemLiquidityState({
      enabled: true,
      isLoading: false,
      isUnavailable: false,
      selectedVault: usdcVault,
      requestedAssets: BigInt(10_000_001),
    }).phase,
  ).toBe("insufficient");
});

test("returns ready when selected vault can satisfy the request", () => {
  const state = getRedeemLiquidityState({
    enabled: true,
    isLoading: false,
    isUnavailable: false,
    selectedVault: usdcVault,
    requestedAssets: BigInt(9_000_000),
  });

  expect(state.phase).toBe("ready");
  expect(state.availableAssets).toBe(BigInt(10_000_000));
});

test("returns unavailable when the liquidity request fails before data is loaded", () => {
  expect(
    getRedeemLiquidityState({
      enabled: true,
      isLoading: false,
      isUnavailable: true,
      selectedVault: null,
      requestedAssets: BigInt(1),
    }).phase,
  ).toBe("unavailable");
});

test("returns unavailable when the selected vault is missing after loading", () => {
  expect(
    getRedeemLiquidityState({
      enabled: true,
      isLoading: false,
      isUnavailable: false,
      selectedVault: null,
      requestedAssets: BigInt(1),
    }).phase,
  ).toBe("unavailable");
});

test("sorts vaults using the selectable asset order", () => {
  expect(
    sortLiquidityVaults([usdtVault, usdcVault], ["USDC", "USDT", "USDS"]).map(
      (vault) => vault.ticker,
    ),
  ).toEqual(["USDC", "USDT"]);
});

test("formats vault availability using vault decimals", () => {
  expect(formatVaultAvailability(usdcVault)).toBe("10");
});
