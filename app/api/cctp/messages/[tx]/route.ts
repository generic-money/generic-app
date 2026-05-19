import { NextResponse } from "next/server";

const IRIS_BASE_URL = "https://iris-api.circle.com/v2";
const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ tx?: string }>;
  },
) {
  const url = new URL(request.url);
  const fallbackTx = url.pathname.split("/").pop() ?? "";
  const resolvedParams = await params;
  const tx = resolvedParams?.tx || fallbackTx;
  const sourceDomain = url.searchParams.get("sourceDomain") ?? "0";

  if (!TX_HASH_PATTERN.test(tx)) {
    return NextResponse.json(
      { error: "Invalid transaction hash", tx },
      { status: 400 },
    );
  }

  if (!/^\d+$/.test(sourceDomain)) {
    return NextResponse.json(
      { error: "Invalid source domain", sourceDomain },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${IRIS_BASE_URL}/messages/${sourceDomain}?transactionHash=${tx}`,
    { cache: "no-store" },
  );
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
