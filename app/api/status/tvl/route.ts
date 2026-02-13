import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";
import {
  getBridgeCoordinatorAddress,
  getPredepositChainNickname,
} from "@/lib/constants/predeposit";
import { withMemoryCache } from "@/lib/memory-cache";

const DECIMALS = 18;
const FALLBACK_RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
];
const RPC_URLS = Array.from(
  new Set(
    [process.env.MAINNET_RPC_URL, ...FALLBACK_RPC_URLS].filter(
      (url): url is string => Boolean(url),
    ),
  ),
);
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

const readWithRpcFallback = async <T>(
  reader: (url: string) => Promise<T>,
): Promise<T> => {
  if (!RPC_URLS.length) {
    throw new Error("MAINNET_RPC_URL is not configured");
  }

  let lastError: unknown;
  for (const url of RPC_URLS) {
    try {
      return await reader(url);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unable to read from configured RPC URLs");
};

const readStatusTvl = async () => {
  const nickname = getPredepositChainNickname("predeposit");
  const bridgeCoordinator = getBridgeCoordinatorAddress();

  return await readWithRpcFallback(async (url) => {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(url),
    });

    return client.readContract({
      address: bridgeCoordinator,
      abi: bridgeCoordinatorAbi,
      functionName: "getTotalPredeposits",
      args: [nickname],
    });
  });
};

export async function GET() {
  try {
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
  } catch {
    return NextResponse.json({ totalPredeposits: "0" });
  }
}
