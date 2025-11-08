import { useMemo } from "react";
import { erc4626Abi, formatUnits, parseUnits } from "viem";
import { arbitrum } from "viem/chains";
import { useReadContract } from "wagmi";

import { type HexAddress, ZERO_ADDRESS } from "@/lib/types/address";
import { formatTokenAmount } from "../utils/format";

type Mode = "deposit" | "redeem";

type Params = {
  amount: string;
  fromDecimals?: number;
  toDecimals?: number;
  vaultAddress?: HexAddress;
  mode: Mode;
};

export function useErc4626Preview({
  amount,
  fromDecimals,
  toDecimals,
  vaultAddress,
  mode,
}: Params) {
  const sanitizedAmount = amount.trim();

  const parsedAmount = useMemo(() => {
    if (!fromDecimals || sanitizedAmount === "") {
      return null;
    }

    try {
      return parseUnits(sanitizedAmount, fromDecimals);
    } catch {
      return null;
    }
  }, [fromDecimals, sanitizedAmount]);

  const args = useMemo(() => {
    if (!parsedAmount || parsedAmount <= 0n) {
      return [0n] as const;
    }

    return [parsedAmount] as const;
  }, [parsedAmount]);

  const enabled = Boolean(
    vaultAddress && toDecimals != null && parsedAmount && parsedAmount > 0n,
  );

  const functionName = mode === "deposit" ? "previewDeposit" : "previewRedeem";

  const { data, ...rest } = useReadContract({
    address: vaultAddress ?? ZERO_ADDRESS,
    abi: erc4626Abi,
    chainId: arbitrum.id,
    functionName,
    args,
    query: {
      enabled,
    },
  });

  const quote = useMemo(() => {
    if (!enabled || data === undefined || toDecimals == null) {
      return "";
    }

    try {
      return formatTokenAmount(formatUnits(data, toDecimals));
    } catch {
      return "";
    }
  }, [data, enabled, toDecimals]);

  return {
    quote,
    rawQuote: data,
    enabled,
    parsedAmount,
    ...rest,
  };
}
