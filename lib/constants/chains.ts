export const CHAINS = {
  ARBITRUM: "arbitrum",
} as const;

export type ChainName = (typeof CHAINS)[keyof typeof CHAINS];

export const DEFAULT_CHAIN: ChainName = CHAINS.ARBITRUM;
