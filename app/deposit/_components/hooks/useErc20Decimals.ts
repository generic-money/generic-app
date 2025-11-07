import { erc20Abi } from "viem";
import { arbitrum } from "viem/chains";
import { useReadContract } from "wagmi";

import { type HexAddress, ZERO_ADDRESS } from "../constants";

type Address = HexAddress | undefined;

export function useErc20Decimals(address: Address) {
  const targetAddress = address ?? ZERO_ADDRESS;

  const { data, ...rest } = useReadContract({
    address: targetAddress,
    abi: erc20Abi,
    chainId: arbitrum.id,
    functionName: "decimals",
    query: {
      enabled: Boolean(address),
    },
  });

  const decimals = data ? Number(data) : undefined;

  return { decimals, ...rest };
}
