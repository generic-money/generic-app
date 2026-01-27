import { NextResponse } from "next/server";
import { createPublicClient, defineChain, formatUnits, http } from "viem";

const CITREA_CHAIN = defineChain({
  id: 4114,
  name: "Citrea",
  network: "citrea",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.citrea.xyz"] },
    public: { http: ["https://rpc.mainnet.citrea.xyz"] },
  },
});

const CITREA_RPC_URL = "https://rpc.mainnet.citrea.xyz";
const CITREA_WHITELABEL =
  "0xAC8c1AEB584765DB16ac3e08D4736CFcE198589B";
const CITREA_VAULT = "0x4Fb03AfE959394DB9C4E312A89C6e485FB3732d1";
const DECIMALS = 18;

const totalSupplyAbi = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const totalAssetsAbi = [
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const formatUsd = (value: bigint) => {
  const formatted = formatUnits(value, DECIMALS);
  const parsed = Number.parseFloat(formatted);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parsed)
    : formatted;
};

export async function GET() {
  const client = createPublicClient({
    chain: CITREA_CHAIN,
    transport: http(CITREA_RPC_URL),
  });

  const [tvlSupply, stakedAssets] = await Promise.all([
    client.readContract({
      address: CITREA_WHITELABEL,
      abi: totalSupplyAbi,
      functionName: "totalSupply",
    }),
    client.readContract({
      address: CITREA_VAULT,
      abi: totalAssetsAbi,
      functionName: "totalAssets",
    }),
  ]);

  const response = NextResponse.json({
    tvl: tvlSupply.toString(),
    tvlFormatted: formatUsd(tvlSupply),
    staked: stakedAssets.toString(),
    stakedFormatted: formatUsd(stakedAssets),
  });

  response.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return response;
}
