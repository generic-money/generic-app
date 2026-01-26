import { erc20Abi } from "viem";
import { useChainId, useReadContract } from "wagmi";

import { type HexAddress, ZERO_ADDRESS } from "@/lib/types/address";

type Params = {
  token?: HexAddress;
  owner?: HexAddress;
  spender?: HexAddress;
  chainIdOverride?: number;
};

export function useTokenAllowance({
  token,
  owner,
  spender,
  chainIdOverride,
}: Params) {
  const enabled = Boolean(token && owner && spender);
  const activeChainId = useChainId();
  const chainId = chainIdOverride ?? activeChainId;

  const { data, refetch, ...rest } = useReadContract({
    address: token ?? ZERO_ADDRESS,
    abi: erc20Abi,
    chainId,
    functionName: "allowance",
    args:
      owner && spender
        ? ([owner, spender] as const)
        : ([ZERO_ADDRESS, ZERO_ADDRESS] as const),
    query: {
      enabled,
    },
  });

  return {
    allowance: data ?? BigInt(0),
    refetchAllowance: refetch,
    ...rest,
  };
}
