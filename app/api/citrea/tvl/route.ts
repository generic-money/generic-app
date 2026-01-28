import { NextResponse } from "next/server";
import { createPublicClient, defineChain, formatUnits, http } from "viem";
import { withMemoryCache } from "@/lib/memory-cache";

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
const TVL_CACHE_TTL_MS = 3_600_000;

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
  const payload = await withMemoryCache(
    "citrea-tvl",
    { ttlMs: TVL_CACHE_TTL_MS, staleWhileRevalidate: true },
    async () => {
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

      return {
        tvl: tvlSupply.toString(),
        tvlFormatted: formatUsd(tvlSupply),
        staked: stakedAssets.toString(),
        stakedFormatted: formatUsd(stakedAssets),
      };
    },
  );

  const response = NextResponse.json(payload);

  response.headers.set(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=3600",
  );
  return response;
}
