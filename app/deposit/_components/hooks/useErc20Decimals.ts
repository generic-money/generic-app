import { erc20Abi } from "viem";
import { useChainId, useReadContract } from "wagmi";

import { type HexAddress, ZERO_ADDRESS } from "@/lib/types/address";

type Address = HexAddress | undefined;

export function useErc20Decimals(address: Address) {
  const targetAddress = address ?? ZERO_ADDRESS;
  const chainId = useChainId();

  const { data, ...rest } = useReadContract({
    address: targetAddress,
    abi: erc20Abi,
    chainId,
    functionName: "decimals",
    query: {
      enabled: Boolean(address),
    },
  });

  const decimals = data ? Number(data) : undefined;

  return { decimals, ...rest };
}
