import { erc20Abi } from "viem";
import { useChainId, useReadContract } from "wagmi";

import { type HexAddress, ZERO_ADDRESS } from "@/lib/types/address";

type Params = {
  token?: HexAddress;
  owner?: HexAddress;
  spender?: HexAddress;
};

export function useTokenAllowance({ token, owner, spender }: Params) {
  const enabled = Boolean(token && owner && spender);
  const chainId = useChainId();

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
