import type { HexAddress } from "../types/address";

type StablecoinAddressConfig = {
  tokenAddress: HexAddress;
  depositVaultAddress: HexAddress;
};

export const SEPOLIA_STABLECOIN_ADDRESSES = {
  USDC: {
    tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    depositVaultAddress: "0x2f00689aB9beb0772F69e332702Ffb4aAe92E63c",
  },
  USDT: {
    tokenAddress: "0xa86631d267E40354eaB5361273065DAfDF316EAc",
    depositVaultAddress: "0xC1C8DB9d9fe2A312Ce5Bd8C76764da8539200a50",
  },
} as const satisfies Record<"USDC" | "USDT", StablecoinAddressConfig>;

export const SEPOLIA_GUSD_TOKEN_ADDRESS =
  "0x6E810122C2B7d474Ef568bdf221ec05f2dC8063A" satisfies HexAddress;

export const SEPOLIA_GENERIC_UNIT_TOKEN_ADDRESS =
  "0xa8fD97eAD3D41324a06c759b37758f99A3c35A4F" satisfies HexAddress;

export const SEPOLIA_GENERIC_DEPOSITOR_ADDRESS =
  "0xc71Ec13671E8b90849a6C329bC869BeAb87327A2" satisfies HexAddress;
