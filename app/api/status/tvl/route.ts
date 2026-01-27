import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";
import {
  getBridgeCoordinatorAddress,
  getPredepositChainNickname,
} from "@/lib/constants/predeposit";

const DECIMALS = 18;
const RPC_URLS = [process.env.MAINNET_RPC_URL].filter(Boolean) as string[];

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
  const totalPredeposits = await readStatusTvl();
  const formatted = formatUnits(totalPredeposits, DECIMALS);
  const formattedNumber = Number.parseFloat(formatted);
  const formattedUsd = Number.isFinite(formattedNumber)
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(formattedNumber)
    : formatted;

  const response = NextResponse.json({
    totalPredeposits: totalPredeposits.toString(),
    formatted: formattedUsd,
  });

  response.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return response;
}
