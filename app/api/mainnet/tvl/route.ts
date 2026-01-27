import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";

const UNIT_TOKEN: `0x${string}` =
  "0x8c307baDbd78bEa5A1cCF9677caa58e7A2172502";
const MAINNET_VAULTS = [
  {
    symbol: "USDC",
    address: "0x4825eFF24F9B7b76EEAFA2ecc6A1D5dFCb3c1c3f",
  },
  {
    symbol: "USDT",
    address: "0xB8280955aE7b5207AF4CDbdCd775135Bd38157fE",
  },
  {
    symbol: "USDS",
    address: "0x6133dA4Cd25773Ebd38542a8aCEF8F94cA89892A",
  },
] as const satisfies ReadonlyArray<{ symbol: string; address: `0x${string}` }>;
const DECIMALS = 18;

const RPC_URLS = [process.env.MAINNET_RPC_URL].filter(Boolean) as string[];
const DEBUG_TVL = process.env.TVL_DEBUG === "true";

const unitAbi = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const vaultAbi = [
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const erc20DecimalsAbi = [
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

const readTotalSupply = async () => {
  if (!RPC_URLS.length) {
    throw new Error("MAINNET_RPC_URL is not configured");
  }
  let lastError: unknown;
  for (const url of RPC_URLS) {
    try {
      const client = createPublicClient({
        chain: mainnet,
        transport: http(url),
      });
      const result = await client.readContract({
        address: UNIT_TOKEN,
        abi: unitAbi,
        functionName: "totalSupply",
      });
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Failed to read totalSupply");
};

const readVaultBreakdown = async () => {
  if (!RPC_URLS.length) {
    throw new Error("MAINNET_RPC_URL is not configured");
  }
  const url = RPC_URLS[0];
  const client = createPublicClient({
    chain: mainnet,
    transport: http(url),
  });

  const vaultData = await Promise.all(
    MAINNET_VAULTS.map(async (vault) => {
      const asset = await client.readContract({
        address: vault.address,
        abi: vaultAbi,
        functionName: "asset",
      });
      const decimals = await client.readContract({
        address: asset,
        abi: erc20DecimalsAbi,
        functionName: "decimals",
      });
      const totalAssets = await client.readContract({
        address: vault.address,
        abi: vaultAbi,
        functionName: "totalAssets",
      });

      const scale = BigInt(10) ** BigInt(18 - Number(decimals));
      const normalized = totalAssets * scale;

      if (DEBUG_TVL) {
        console.log("[tvl] vault", {
          symbol: vault.symbol,
          vault: vault.address,
          asset,
          decimals: Number(decimals),
          totalAssets: totalAssets.toString(),
          normalized: normalized.toString(),
        });
      }

      return {
        symbol: vault.symbol,
        totalAssets,
        decimals: Number(decimals),
        normalized,
      };
    }),
  );

  const totalNormalized = vaultData.reduce(
    (sum, item) => sum + item.normalized,
    BigInt(0),
  );

  const breakdown = vaultData.map((item) => {
    const half = totalNormalized / BigInt(2);
    const percentRounded = totalNormalized
      ? (item.normalized * BigInt(100) + half) / totalNormalized
      : BigInt(0);
    const percentNumber = totalNormalized
      ? Number(item.normalized) / Number(totalNormalized)
      : 0;
    const percentFormatted = `${percentRounded.toString()}%`;

    if (DEBUG_TVL) {
      console.log("[tvl] percent", {
        symbol: item.symbol,
        percent: percentNumber,
        percentRounded: percentRounded.toString(),
        totalNormalized: totalNormalized.toString(),
      });
    }

    return {
      symbol: item.symbol,
      percent: percentNumber,
      percentFormatted,
    };
  });

  return breakdown;
};

export async function GET() {
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
  const response = NextResponse.json({
    totalSupply: totalSupply.toString(),
    formatted: formattedUsd,
    breakdown: breakdown.map((item) => ({
      symbol: item.symbol,
      percent: item.percent,
      percentFormatted: item.percentFormatted,
    })),
  });

  response.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return response;
}
