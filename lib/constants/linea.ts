import type { HexAddress } from "../types/address";

export const LINEA_CHAIN_ID = 59144;
export const LINEA_CHAIN_LABEL = "Linea";

export const LINEA_TOKEN_BRIDGE_ADDRESS =
  "0x051F1D88f0aF5763fB888eC4378b4D8B29ea3319" as const satisfies HexAddress;

export const CCTP_ETHEREUM_DOMAIN = 0;
export const CCTP_LINEA_DOMAIN = 11;
export const CCTP_STANDARD_FINALITY_THRESHOLD = 2000;
export const CCTP_TOKEN_MESSENGER_V2_ADDRESS =
  "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d" as const satisfies HexAddress;
export const CCTP_MESSAGE_TRANSMITTER_V2_ADDRESS =
  "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64" as const satisfies HexAddress;

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export const lineaTokenBridgeAbi = [
  {
    type: "function",
    name: "messageService",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "bridgeToken",
    stateMutability: "payable",
    inputs: [
      { name: "_token", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_recipient", type: "address" },
    ],
    outputs: [],
  },
] as const;

export const lineaMessageServiceAbi = [
  {
    type: "function",
    name: "minimumFeeInWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const cctpTokenMessengerV2Abi = [
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [],
  },
] as const;

export const cctpMessageTransmitterV2Abi = [
  {
    type: "function",
    name: "receiveMessage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;
