import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";
import {
  getBridgeCoordinatorAddress,
  getPredepositChainNickname,
} from "@/lib/constants/predeposit";
import { withMemoryCache } from "@/lib/memory-cache";

const DECIMALS = 18;
const RPC_URLS = [process.env.MAINNET_RPC_URL].filter(Boolean) as string[];
const TVL_CACHE_TTL_MS = 3_600_000;

const bridgeCoordinatorAbi = [
  {
    name: "getTotalPredeposits",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const readStatusTvl = async () => {
  if (!RPC_URLS.length) {
    throw new Error("MAINNET_RPC_URL is not configured");
  }

  const client = createPublicClient({
    chain: mainnet,
    transport: http(RPC_URLS[0]),
  });

  const nickname = getPredepositChainNickname("predeposit");
  const bridgeCoordinator = getBridgeCoordinatorAddress();

  return await client.readContract({
    address: bridgeCoordinator,
    abi: bridgeCoordinatorAbi,
    functionName: "getTotalPredeposits",
    args: [nickname],
  });
};

export async function GET() {
  const payload = await withMemoryCache(
    "status-tvl",
    { ttlMs: TVL_CACHE_TTL_MS, staleWhileRevalidate: true },
    async () => {
      const totalPredeposits = await readStatusTvl();
      const formatted = formatUnits(totalPredeposits, DECIMALS);
      const formattedNumber = Number.parseFloat(formatted);
      const formattedUsd = Number.isFinite(formattedNumber)
        ? new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(formattedNumber)
        : formatted;

      return {
        totalPredeposits: totalPredeposits.toString(),
        formatted: formattedUsd,
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
