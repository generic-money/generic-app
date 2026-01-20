import type { HexAddress } from "../types/address";
import type { ChainName } from "./chains";
import { CHAINS, DEFAULT_CHAIN } from "./chains";
import type { OpportunityRoute } from "./opportunity-theme";

type HexBytes = `0x${string}`;

type PredepositRoute = Exclude<OpportunityRoute, "mainnet">;

const PREDEPOSIT_CHAIN_NICKNAMES: Record<PredepositRoute, HexBytes> = {
  predeposit:
    "0xa4fdc657c7ba2402ba336e88c4ae1c72169f7bc116987c8aefd50982676d9a17",
  citrea: "0x5d8f3ef2cb4337c01981e156bbfbf58e6df65b10a2ce34e33777dbb3ad8e7d2f",
};

export const BRIDGE_COORDINATOR_ADDRESSES: Record<ChainName, HexAddress> = {
  [CHAINS.MAINNET]: "0x0503F2C5A1a4b72450c6Cfa790F2097CF5cB6a01",
};

export const getBridgeCoordinatorAddress = (chain: ChainName = DEFAULT_CHAIN) =>
  BRIDGE_COORDINATOR_ADDRESSES[chain];

export function getPredepositChainNickname(route: PredepositRoute): HexBytes;
export function getPredepositChainNickname(route: "mainnet"): undefined;
export function getPredepositChainNickname(route: OpportunityRoute) {
  if (route === "mainnet") {
    return undefined;
  }

  return PREDEPOSIT_CHAIN_NICKNAMES[route];
}
