import type { ChainName } from "./chains";

type Address = `0x${string}`;

export type StablecoinTicker = "USDC" | "USDT" | "USDS";

type StablecoinChainConfig = {
  tokenAddress: Address;
  depositVaultAddress: Address;
};

type StablecoinDefinition = {
  ticker: StablecoinTicker;
  conversionValue: number;
  chains: Partial<Record<ChainName, StablecoinChainConfig>>;
  iconUrl: string;
};

type MultichainTokenDefinition<TTicker extends string> = {
  ticker: TTicker;
  conversionValue: number;
  iconUrl: string;
  chains: Partial<Record<ChainName, Address>>;
};

export const STABLECOIN_DEFINITIONS = {
  USDC: {
    ticker: "USDC",
    conversionValue: 1,
    iconUrl: "/tokens/usdc.svg",
    chains: {
      mainnet: {
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        depositVaultAddress: "0x4825eFF24F9B7b76EEAFA2ecc6A1D5dFCb3c1c3f",
      },
    },
  },
  USDT: {
    ticker: "USDT",
    conversionValue: 1,
    iconUrl: "/tokens/usdt.svg",
    chains: {
      mainnet: {
        tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        depositVaultAddress: "0xB8280955aE7b5207AF4CDbdCd775135Bd38157fE",
      },
    },
  },
  USDS: {
    ticker: "USDS",
    conversionValue: 1,
    iconUrl: "/tokens/usds.svg",
    chains: {
      mainnet: {
        tokenAddress: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
        depositVaultAddress: "0x6133dA4Cd25773Ebd38542a8aCEF8F94cA89892A",
      },
    },
  },
} as const satisfies Record<StablecoinTicker, StablecoinDefinition>;

export const GUSD_DEFINITION = {
  ticker: "GUSD",
  conversionValue: 1,
  iconUrl: "/tokens/gusd.svg",
  chains: {
    mainnet: "0xd8495139625d5589e5CB5eD54284D05EA1aa7eFd",
  },
} as const satisfies MultichainTokenDefinition<"GUSD">;

export type GusdTicker = typeof GUSD_DEFINITION.ticker;
