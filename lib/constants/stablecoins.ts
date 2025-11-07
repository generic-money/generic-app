import type { ChainName } from "./chains";

type Address = `0x${string}`;

export type StablecoinTicker = "USDC" | "USDT";

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
      arbitrum: {
        tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        depositVaultAddress: "0xef7d496E10e1E18FAECF38922f8D98c33F92E13a",
      },
    },
  },
  USDT: {
    ticker: "USDT",
    conversionValue: 1,
    iconUrl: "/tokens/usdt.svg",
    chains: {
      arbitrum: {
        tokenAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        depositVaultAddress: "0x65bB7b99D965f726170FA269A9Ca14A7355F7206",
      },
    },
  },
} as const satisfies Record<StablecoinTicker, StablecoinDefinition>;

export const GUSD_DEFINITION = {
  ticker: "GUSD",
  conversionValue: 1,
  iconUrl: "/tokens/gusd.svg",
  chains: {
    arbitrum: "0xd8495139625d5589e5CB5eD54284D05EA1aa7eFd",
  },
} as const satisfies MultichainTokenDefinition<"GUSD">;

export type GusdTicker = typeof GUSD_DEFINITION.ticker;
