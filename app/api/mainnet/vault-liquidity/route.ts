import { NextResponse } from "next/server";
import { withMemoryCache } from "@/lib/memory-cache";
import {
  readMainnetVaultLiquiditySnapshot,
  serializeMainnetVaultLiquidity,
} from "@/lib/server/mainnet-vault-liquidity";

const VAULT_LIQUIDITY_CACHE_TTL_MS = 30_000;

export async function GET() {
  try {
    const payload = await withMemoryCache(
      "mainnet-vault-liquidity",
      { ttlMs: VAULT_LIQUIDITY_CACHE_TTL_MS, staleWhileRevalidate: true },
      async () =>
        serializeMainnetVaultLiquidity(
          await readMainnetVaultLiquiditySnapshot(),
        ),
    );

    const response = NextResponse.json(payload);
    response.headers.set(
      "Cache-Control",
      "s-maxage=30, stale-while-revalidate=30",
    );
    return response;
  } catch {
    return NextResponse.json(
      {
        updatedAt: new Date(0).toISOString(),
        vaults: [],
      },
      { status: 503 },
    );
  }
}
