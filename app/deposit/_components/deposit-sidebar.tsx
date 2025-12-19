"use client";

import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Layers,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { mainnet } from "viem/chains";
import { useAccount, useBalance, useReadContract } from "wagmi";

import { getGenericUnitTokenAddress } from "@/lib/constants/contracts";
import {
  BRIDGE_COORDINATOR_L1_ADDRESS,
  PREDEPOSIT_CHAIN_NICKNAME,
} from "@/lib/constants/predeposit";
import { gusd } from "@/lib/models/tokens";
import { type HexAddress, ZERO_ADDRESS } from "@/lib/types/address";
import { cn } from "@/lib/utils";
import { useErc20Decimals } from "./hooks/useErc20Decimals";
import { formatTokenAmount } from "./utils/format";

type DepositSidebarProps = {
  className?: string;
};

const toBytes32 = (value: HexAddress) =>
  `0x${value.slice(2).padStart(64, "0")}` as const;

const bridgeCoordinatorAbi = [
  {
    type: "function",
    name: "getPredeposit",
    stateMutability: "view",
    inputs: [
      { name: "chainNickname", type: "bytes32" },
      { name: "sender", type: "address" },
      { name: "remoteRecipient", type: "bytes32" },
    ],
    outputs: [{ name: "amount", type: "uint256" }],
  },
] as const;

type BalanceLike = {
  isLoading: boolean;
  isError: boolean;
  data?: {
    formatted?: string;
    symbol?: string;
  } | null;
};

const formatTokenBalance = (balance: BalanceLike, accountAddress?: string) => {
  if (!accountAddress) {
    return "—";
  }

  if (balance.isLoading) {
    return "Loading…";
  }

  if (balance.isError) {
    return "Unavailable";
  }

  const formatted = balance.data?.formatted;
  const symbol = balance.data?.symbol ?? "";
  if (!formatted) {
    return `0 ${symbol}`.trim();
  }

  return `${formatTokenAmount(formatted)} ${symbol}`.trim();
};

export function DepositSidebar({ className }: DepositSidebarProps = {}) {
  const [open, setOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const genericUnitTokenAddress = getGenericUnitTokenAddress();
  const gusdAddress = gusd.getAddress();
  const { decimals: unitDecimals } = useErc20Decimals(genericUnitTokenAddress);

  const unitBalance = useBalance({
    address: accountAddress,
    token: genericUnitTokenAddress,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(accountAddress && genericUnitTokenAddress),
    },
  });

  const gusdBalance = useBalance({
    address: accountAddress,
    token: gusdAddress,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(accountAddress && gusdAddress),
    },
  });

  const predepositEnabled = Boolean(accountAddress);
  const predepositRecipient = accountAddress
    ? toBytes32(accountAddress)
    : toBytes32(ZERO_ADDRESS);
  const {
    data: predepositAmount,
    isLoading: isPredepositLoading,
    isError: isPredepositError,
    error: predepositError,
  } = useReadContract({
    address: BRIDGE_COORDINATOR_L1_ADDRESS,
    abi: bridgeCoordinatorAbi,
    chainId: mainnet.id,
    functionName: "getPredeposit",
    args: predepositEnabled
      ? ([PREDEPOSIT_CHAIN_NICKNAME, accountAddress, predepositRecipient] as const)
      : ([PREDEPOSIT_CHAIN_NICKNAME, ZERO_ADDRESS, predepositRecipient] as const),
    query: {
      enabled: predepositEnabled,
    },
  });

  useEffect(() => {
    if (!accountAddress) {
      return;
    }

    console.info("Predeposit read", {
      address: BRIDGE_COORDINATOR_L1_ADDRESS,
      chainId: mainnet.id,
      args: [PREDEPOSIT_CHAIN_NICKNAME, accountAddress, predepositRecipient],
      enabled: predepositEnabled,
    });
  }, [accountAddress, predepositEnabled, predepositRecipient]);

  useEffect(() => {
    if (!predepositError) {
      return;
    }

    console.error("Predeposit read error", predepositError);
  }, [predepositError]);

  useEffect(() => {
    if (predepositAmount == null) {
      return;
    }

    console.info("Predeposit read result", {
      amount: predepositAmount.toString(),
      decimals: unitDecimals,
    });
  }, [predepositAmount, unitDecimals]);

  const unitBalanceValue = useMemo(
    () => formatTokenBalance(unitBalance, accountAddress),
    [accountAddress, unitBalance],
  );

  const gusdBalanceValue = useMemo(
    () => formatTokenBalance(gusdBalance, accountAddress),
    [accountAddress, gusdBalance],
  );

  const predepositValue = useMemo(() => {
    if (!accountAddress) {
      return "—";
    }

    if (isPredepositLoading) {
      return "Loading…";
    }

    if (isPredepositError || predepositAmount == null || unitDecimals == null) {
      return "Unavailable";
    }

    const symbol = unitBalance.data?.symbol ?? "Units";
    return `${formatTokenAmount(formatUnits(predepositAmount, unitDecimals))} ${symbol}`.trim();
  }, [
    accountAddress,
    isPredepositError,
    isPredepositLoading,
    predepositAmount,
    unitDecimals,
    unitBalance.data?.symbol,
  ]);

  const hasUnits = (unitBalance.data?.value ?? 0n) > 0n;
  const hasGusd = (gusdBalance.data?.value ?? 0n) > 0n;
  const hasPredeposit = (predepositAmount ?? 0n) > 0n;
  const positionsCount = accountAddress
    ? [hasUnits, hasGusd, hasPredeposit].filter(Boolean).length
    : 0;

  return (
    <aside
      className={cn(
        "relative z-50 flex h-[520px] overflow-hidden rounded-l-3xl rounded-r-none border border-border/60 bg-background transition-[width] duration-300 ease-out",
        open ? "w-72" : "w-12",
        className,
      )}
    >
      {open ? (
        <div className="flex h-full w-full flex-col">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              aria-label="Collapse sidebar"
              aria-expanded={open}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition hover:bg-muted/40"
              onClick={() => setOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Positions
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-4 px-4 py-6">
            {hasUnits ? (
              <div className="rounded-2xl border border-border/60 bg-muted/70 p-4 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    Units
                  </p>
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {unitBalanceValue}
                </p>
              </div>
            ) : null}
            {hasGusd ? (
              <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-md ring-1 ring-white/10 transition-shadow hover:shadow-lg">
                <div className="flex items-center gap-2 text-primary-foreground/80">
                  <Droplet className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    GUSD
                  </p>
                </div>
                <p className="mt-2 text-lg font-semibold text-primary-foreground">
                  {gusdBalanceValue}
                </p>
              </div>
            ) : null}
            {hasPredeposit ? (
              <div className="rounded-2xl bg-[#7140FD] p-4 text-white shadow-md ring-1 ring-white/10 transition-shadow hover:shadow-lg">
                <div className="flex items-center gap-2 text-white/80">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    Predeposit
                  </p>
                </div>
                <p className="mt-2 text-lg font-semibold text-white">
                  {predepositValue}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center gap-3 px-2 py-4">
          <button
            type="button"
            aria-label="Expand sidebar"
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition hover:bg-muted/40"
            onClick={() => setOpen(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white shadow-sm">
            {positionsCount}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground [writing-mode:vertical-rl] [text-orientation:upright]">
            Positions
          </span>
          <div className="flex-1" />
        </div>
      )}
    </aside>
  );
}
