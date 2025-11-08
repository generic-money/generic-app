import type { HexAddress } from "../types/address";
import type { ChainName } from "./chains";
import { DEFAULT_CHAIN } from "./chains";

const DEFAULT_GENERIC_DEPOSITOR_ADDRESS =
  "0xB218982a118851473E7bd00724d26D717f5960C0" satisfies HexAddress;

const GENERIC_DEPOSITOR_ADDRESSES: Partial<Record<ChainName, HexAddress>> = {
  [DEFAULT_CHAIN]:
    (process.env.NEXT_PUBLIC_GENERIC_DEPOSITOR_ADDRESS as
      | HexAddress
      | undefined) ?? DEFAULT_GENERIC_DEPOSITOR_ADDRESS,
};

export const getGenericDepositorAddress = (chain: ChainName = DEFAULT_CHAIN) =>
  GENERIC_DEPOSITOR_ADDRESSES[chain];
