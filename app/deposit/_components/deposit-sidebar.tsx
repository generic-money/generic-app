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
import { useAccount, useBalance, useChainId, useReadContract } from "wagmi";

import { CHAIN_ID_BY_NAME, getChainNameById } from "@/lib/constants/chains";
import { getGenericUnitTokenAddress } from "@/lib/constants/contracts";
import {
  getBridgeCoordinatorAddress,
  getPredepositChainNickname,
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

const POSITION_PRECISION = 4;

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

  return `${formatTokenAmount(formatted, POSITION_PRECISION)} ${symbol}`.trim();
};

const formatPositionValue = (value: string) => {
  if (value === "—" || value === "Loading…" || value === "Unavailable") {
    return value;
  }

  return value.startsWith("$") ? value : `$${value}`;
};

export function DepositSidebar({ className }: DepositSidebarProps = {}) {
  const [open, setOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const chainId = useChainId();
  const chainName = getChainNameById(chainId);
  const genericUnitTokenAddress = getGenericUnitTokenAddress(chainName);
  const gusdAddress = gusd.getAddress(chainName);
  const { decimals: unitDecimals } = useErc20Decimals(genericUnitTokenAddress);
  const predepositChainId = CHAIN_ID_BY_NAME[chainName];
  const bridgeCoordinatorAddress = getBridgeCoordinatorAddress(chainName);
  const predepositChainNickname = getPredepositChainNickname(chainName);

  const unitBalance = useBalance({
    address: accountAddress,
    token: genericUnitTokenAddress,
    chainId,
    query: {
      enabled: Boolean(accountAddress && genericUnitTokenAddress),
    },
  });

  const gusdBalance = useBalance({
    address: accountAddress,
    token: gusdAddress,
    chainId,
    query: {
      enabled: Boolean(accountAddress && gusdAddress),
    },
  });

  const predepositEnabled = Boolean(accountAddress);
  const predepositSender = accountAddress ?? ZERO_ADDRESS;
  const predepositRecipient = accountAddress
    ? toBytes32(accountAddress)
    : toBytes32(ZERO_ADDRESS);
  const {
    data: predepositAmount,
    isLoading: isPredepositLoading,
    isError: isPredepositError,
    error: predepositError,
  } = useReadContract({
    address: bridgeCoordinatorAddress,
    abi: bridgeCoordinatorAbi,
    chainId: predepositChainId,
    functionName: "getPredeposit",
    args: [
      predepositChainNickname,
      predepositSender,
      predepositRecipient,
    ] as const,
    query: {
      enabled: predepositEnabled,
    },
  });

  useEffect(() => {
    if (!accountAddress) {
      return;
    }

    console.info("Predeposit read", {
      address: bridgeCoordinatorAddress,
      chainId: predepositChainId,
      args: [predepositChainNickname, accountAddress, predepositRecipient],
      enabled: predepositEnabled,
    });
  }, [
    accountAddress,
    bridgeCoordinatorAddress,
    predepositChainId,
    predepositChainNickname,
    predepositEnabled,
    predepositRecipient,
  ]);

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
    () => formatPositionValue(formatTokenBalance(unitBalance, accountAddress)),
    [accountAddress, unitBalance],
  );

  const gusdBalanceValue = useMemo(
    () => formatPositionValue(formatTokenBalance(gusdBalance, accountAddress)),
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

    const formatted =
      `${formatTokenAmount(formatUnits(predepositAmount, unitDecimals), POSITION_PRECISION)} GUSD`.trim();
    return formatPositionValue(formatted);
  }, [
    accountAddress,
    isPredepositError,
    isPredepositLoading,
    predepositAmount,
    unitDecimals,
  ]);

  const zeroBigInt = BigInt(0);
  const hasUnits = (unitBalance.data?.value ?? zeroBigInt) > zeroBigInt;
  const hasGusd = (gusdBalance.data?.value ?? zeroBigInt) > zeroBigInt;
  const hasPredeposit = (predepositAmount ?? zeroBigInt) > zeroBigInt;
  const positionsCount = accountAddress
    ? [hasUnits, hasGusd, hasPredeposit].filter(Boolean).length
    : 0;
  const showEmptyState = positionsCount === 0;

  return (
    <aside
      className={cn(
        "relative z-50 flex h-[520px] overflow-hidden rounded-l-3xl rounded-r-none border border-border/60 bg-card/60 transition-[width] duration-300 ease-out",
        open ? "w-60" : "w-12",
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
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm transition hover:shadow-md">
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
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2 text-primary/80">
                  <Droplet className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    GUSD
                  </p>
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {gusdBalanceValue}
                </p>
              </div>
            ) : null}
            {hasPredeposit ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2 text-primary/80">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    Status Predeposit
                  </p>
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {predepositValue}
                </p>
              </div>
            ) : null}
            {showEmptyState ? (
              <div className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/70 p-4 text-center text-sm text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                  No positions
                </span>
                <span className="mt-2 text-xs font-medium text-muted-foreground/80">
                  Deposits will appear here.
                </span>
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
          <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow-sm">
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
