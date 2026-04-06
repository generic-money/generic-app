import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";
import { withMemoryCache } from "@/lib/memory-cache";
import {
  readMainnetVaultLiquiditySnapshot,
  readWithMainnetRpcFallback,
} from "@/lib/server/mainnet-vault-liquidity";

const UNIT_TOKEN: `0x${string}` = "0x8c307baDbd78bEa5A1cCF9677caa58e7A2172502";
const DECIMALS = 18;
const TVL_CACHE_TTL_MS = 3_600_000;

const unitAbi = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const readTotalSupply = async () => {
  return await readWithMainnetRpcFallback(async (url) => {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(url),
    });

    return client.readContract({
      address: UNIT_TOKEN,
      abi: unitAbi,
      functionName: "totalSupply",
    });
  });
};

const readVaultBreakdown = async () => {
  const vaultData = (await readMainnetVaultLiquiditySnapshot()).vaults;
  const totalNormalized = vaultData.reduce(
    (sum, item) => sum + item.normalizedAmount,
    BigInt(0),
  );

  const breakdown = vaultData.map((item) => {
    const half = totalNormalized / BigInt(2);
    const percentRounded = totalNormalized
      ? (item.normalizedAmount * BigInt(100) + half) / totalNormalized
      : BigInt(0);
    const percentNumber = totalNormalized
      ? Number(item.normalizedAmount) / Number(totalNormalized)
      : 0;
    const percentFormatted = `${percentRounded.toString()}%`;

    return {
      symbol: item.ticker,
      percent: percentNumber,
      percentFormatted,
    };
  });

  return breakdown;
};

export async function GET() {
  try {
    const payload = await withMemoryCache(
      "mainnet-tvl",
      { ttlMs: TVL_CACHE_TTL_MS, staleWhileRevalidate: true },
      async () => {
        const totalSupply = await readTotalSupply();
        const breakdown = await readVaultBreakdown();
        const formatted = formatUnits(totalSupply, DECIMALS);
        const formattedNumber = Number.parseFloat(formatted);
        const formattedUsd = Number.isFinite(formattedNumber)
          ? new Intl.NumberFormat("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(formattedNumber)
          : formatted;

        return {
          totalSupply: totalSupply.toString(),
          formatted: formattedUsd,
          breakdown: breakdown.map((item) => ({
            symbol: item.symbol,
            percent: item.percent,
            percentFormatted: item.percentFormatted,
          })),
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
    return NextResponse.json({ breakdown: [] });
  }
}
