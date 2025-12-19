import type { HexAddress } from "../types/address";

type HexBytes = `0x${string}`;

export const PREDEPOSIT_CHAIN_NICKNAME =
  "0xa4fdc657c7ba2402ba336e88c4ae1c72169f7bc116987c8aefd50982676d9a17" as const satisfies HexBytes;

export const BRIDGE_COORDINATOR_L1_ADDRESS =
  "0x0503F2C5A1a4b72450c6Cfa790F2097CF5cB6a01" satisfies HexAddress;
