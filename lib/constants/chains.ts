import { mainnet } from "@reown/appkit/networks";

export const CHAINS = {
  MAINNET: "mainnet",
} as const;

export type ChainName = (typeof CHAINS)[keyof typeof CHAINS];

export const DEFAULT_CHAIN: ChainName = CHAINS.MAINNET;

export const CHAIN_ID_BY_NAME: Record<ChainName, number> = {
  [CHAINS.MAINNET]: mainnet.id,
};

export const getChainNameById = (_chainId?: number): ChainName => DEFAULT_CHAIN;
