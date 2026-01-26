import { NextResponse } from "next/server";

const SCAN_BASE_URL = "https://scan.layerzero-api.com/v1";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ tx?: string }>;
  },
) {
  const url = new URL(_request.url);
  const fallbackTx = url.pathname.split("/").pop() ?? "";
  const resolvedParams = await params;
  const tx = resolvedParams?.tx || fallbackTx;
  if (!tx) {
    return NextResponse.json(
      { error: "Invalid transaction hash", tx: params.tx ?? "" },
      { status: 400 },
    );
  }

  const response = await fetch(`${SCAN_BASE_URL}/messages/tx/${tx}`, {
    cache: "no-store",
  });

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
