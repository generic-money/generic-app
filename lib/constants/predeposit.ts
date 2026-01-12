import type { HexAddress } from "../types/address";
import type { ChainName } from "./chains";
import { CHAINS, DEFAULT_CHAIN } from "./chains";

type HexBytes = `0x${string}`;

const PREDEPOSIT_CHAIN_NICKNAMES: Record<ChainName, HexBytes> = {
  [CHAINS.MAINNET]:
    "0xa4fdc657c7ba2402ba336e88c4ae1c72169f7bc116987c8aefd50982676d9a17",
};

export const BRIDGE_COORDINATOR_ADDRESSES: Record<ChainName, HexAddress> = {
  [CHAINS.MAINNET]: "0x0503F2C5A1a4b72450c6Cfa790F2097CF5cB6a01",
};

export const getBridgeCoordinatorAddress = (chain: ChainName = DEFAULT_CHAIN) =>
  BRIDGE_COORDINATOR_ADDRESSES[chain];

export const getPredepositChainNickname = (chain: ChainName = DEFAULT_CHAIN) =>
  PREDEPOSIT_CHAIN_NICKNAMES[chain];
