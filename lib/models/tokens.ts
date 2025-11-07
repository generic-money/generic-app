import { type ChainName, DEFAULT_CHAIN } from "../constants/chains";
import {
  GUSD_DEFINITION,
  STABLECOIN_DEFINITIONS,
  type StablecoinTicker,
} from "../constants/stablecoins";

type Address = `0x${string}`;

export class Stablecoin {
  constructor(
    public readonly ticker: StablecoinTicker,
    public readonly tokenAddress: Address,
    public readonly depositVaultAddress: Address,
    public readonly conversionValue: number,
    public readonly chain: ChainName,
    public readonly iconUrl: string,
  ) {}
}

export class MultichainToken<TTicker extends string> {
  constructor(
    public readonly ticker: TTicker,
    public readonly conversionValue: number,
    private readonly chainAddresses: Partial<Record<ChainName, Address>>,
    public readonly iconUrl: string,
  ) {}

  getAddress(chain: ChainName = DEFAULT_CHAIN): Address | undefined {
    return this.chainAddresses[chain];
  }

  get addresses(): Partial<Record<ChainName, Address>> {
    return this.chainAddresses;
  }
}

const createStablecoin = (ticker: StablecoinTicker): Stablecoin => {
  const definition = STABLECOIN_DEFINITIONS[ticker];
  const chainConfig = definition.chains[DEFAULT_CHAIN];

  if (!chainConfig) {
    throw new Error(
      `Stablecoin ${ticker} is not configured for chain "${DEFAULT_CHAIN}".`,
    );
  }

  return new Stablecoin(
    definition.ticker,
    chainConfig.tokenAddress,
    chainConfig.depositVaultAddress,
    definition.conversionValue,
    DEFAULT_CHAIN,
    definition.iconUrl,
  );
};

export const stablecoins = [
  createStablecoin("USDC"),
  createStablecoin("USDT"),
] as const;

export const gusd = new MultichainToken(
  GUSD_DEFINITION.ticker,
  GUSD_DEFINITION.conversionValue,
  GUSD_DEFINITION.chains,
  GUSD_DEFINITION.iconUrl,
);
