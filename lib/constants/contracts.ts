import type { HexAddress } from "../types/address";
import type { ChainName } from "./chains";
import { CHAINS, DEFAULT_CHAIN } from "./chains";

const DEFAULT_GENERIC_DEPOSITOR_ADDRESS =
  "0x79B4cDb14A31E8B0e21C0120C409Ac14Af35f919" satisfies HexAddress;

const DEFAULT_GENERIC_UNIT_TOKEN_ADDRESS =
  "0x8c307baDbd78bEa5A1cCF9677caa58e7A2172502" satisfies HexAddress;

const GENERIC_DEPOSITOR_ADDRESSES: Partial<Record<ChainName, HexAddress>> = {
  [CHAINS.MAINNET]:
    (process.env.NEXT_PUBLIC_GENERIC_DEPOSITOR_ADDRESS as
      | HexAddress
      | undefined) ?? DEFAULT_GENERIC_DEPOSITOR_ADDRESS,
};

const GENERIC_UNIT_TOKEN_ADDRESSES: Partial<Record<ChainName, HexAddress>> = {
  [CHAINS.MAINNET]:
    (process.env.NEXT_PUBLIC_GENERIC_UNIT_TOKEN_ADDRESS as
      | HexAddress
      | undefined) ?? DEFAULT_GENERIC_UNIT_TOKEN_ADDRESS,
};

export const getGenericDepositorAddress = (chain: ChainName = DEFAULT_CHAIN) =>
  GENERIC_DEPOSITOR_ADDRESSES[chain];

export const getGenericUnitTokenAddress = (chain: ChainName = DEFAULT_CHAIN) =>
  GENERIC_UNIT_TOKEN_ADDRESSES[chain];
