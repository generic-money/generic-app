"use client";

import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Lock,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useOpportunityRoute } from "@/context";
import { CHAIN_ID_BY_NAME, CHAINS } from "@/lib/constants/chains";
import { getGenericUnitTokenAddress } from "@/lib/constants/contracts";
import {
  getBridgeCoordinatorAddress,
  getPredepositChainNickname,
} from "@/lib/constants/predeposit";
import {
  isFinalLzStatus,
  type LzBridgeRecord,
  loadLzBridgeRecords,
} from "@/lib/layerzero/scan";
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
const USD_PRECISION = 2;
const CITREA_RPC_URL = "https://rpc.mainnet.citrea.xyz";
const CITREA_WHITELABEL_ADDRESS =
  "0xAC8c1AEB584765DB16ac3e08D4736CFcE198589B" as const satisfies HexAddress;
const CITREA_VAULT_ADDRESS =
  "0x4Fb03AfE959394DB9C4E312A89C6e485FB3732d1" as const satisfies HexAddress;

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

const formatUsdValue = (value: string) => {
  if (value === "—" || value === "Loading…" || value === "Unavailable") {
    return value;
  }

  return value.startsWith("$") ? value : `$${value}`;
};

const formatUsdFromToken = (amount: bigint, decimals: number | null) => {
  if (decimals == null) {
    return "Unavailable";
  }

  return formatUsdValue(
    formatTokenAmount(formatUnits(amount, decimals), USD_PRECISION),
  );
};

export function DepositSidebar({ className }: DepositSidebarProps = {}) {
  const [open, setOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const { setRoute, setFlow } = useOpportunityRoute();
  const chainName = CHAINS.MAINNET;
  const mainnetChainId = CHAIN_ID_BY_NAME[CHAINS.MAINNET];
  const genericUnitTokenAddress = getGenericUnitTokenAddress(chainName);
  const gusdAddress = gusd.getAddress(chainName);
  const { decimals: gusdDecimals } = useErc20Decimals(
    gusdAddress,
    mainnetChainId,
  );
  const citreaClient = useMemo(
    () => createPublicClient({ transport: http(CITREA_RPC_URL) }),
    [],
  );
  const [citreaDecimals, setCitreaDecimals] = useState<number | null>(null);
  const [citreaBalance, setCitreaBalance] = useState<bigint | null>(null);
  const [isCitreaBalanceLoading, setIsCitreaBalanceLoading] = useState(false);
  const [isCitreaBalanceError, setIsCitreaBalanceError] = useState(false);
  const [citreaVaultDecimals, setCitreaVaultDecimals] = useState<number | null>(
    null,
  );
  const [citreaVaultBalance, setCitreaVaultBalance] = useState<bigint | null>(
    null,
  );
  const [isCitreaVaultLoading, setIsCitreaVaultLoading] = useState(false);
  const [isCitreaVaultError, setIsCitreaVaultError] = useState(false);
  const [lzBridgeRecords, setLzBridgeRecords] = useState<LzBridgeRecord[]>([]);
  const citreaFetchEnabled = Boolean(
    accountAddress && CITREA_WHITELABEL_ADDRESS,
  );
  const citreaVaultFetchEnabled = Boolean(
    accountAddress && CITREA_VAULT_ADDRESS,
  );
  const predepositChainId = mainnetChainId;
  const bridgeCoordinatorAddress = getBridgeCoordinatorAddress(chainName);
  const statusPredepositChainNickname =
    getPredepositChainNickname("predeposit");

  const unitBalance = useBalance({
    address: accountAddress,
    token: genericUnitTokenAddress,
    chainId: mainnetChainId,
    query: {
      enabled: Boolean(accountAddress && genericUnitTokenAddress),
    },
  });

  const gusdBalance = useBalance({
    address: accountAddress,
    token: gusdAddress,
    chainId: mainnetChainId,
    query: {
      enabled: Boolean(accountAddress && gusdAddress),
    },
  });

  const predepositEnabled = Boolean(accountAddress && bridgeCoordinatorAddress);
  const predepositSender = accountAddress ?? ZERO_ADDRESS;
  const predepositRecipient = accountAddress
    ? toBytes32(accountAddress)
    : toBytes32(ZERO_ADDRESS);

  const {
    data: statusPredepositAmount,
    isLoading: isStatusPredepositLoading,
    isError: isStatusPredepositError,
  } = useReadContract({
    address: bridgeCoordinatorAddress,
    abi: bridgeCoordinatorAbi,
    chainId: predepositChainId,
    functionName: "getPredeposit",
    args: [
      statusPredepositChainNickname,
      predepositSender,
      predepositRecipient,
    ] as const,
    query: {
      enabled: predepositEnabled,
    },
  });

  useEffect(() => {
    let cancelled = false;

    if (!citreaFetchEnabled) {
      setCitreaBalance(null);
      setIsCitreaBalanceLoading(false);
      setIsCitreaBalanceError(false);
      return;
    }

    setIsCitreaBalanceLoading(true);
    setIsCitreaBalanceError(false);

    const fetchBalance = async () => {
      try {
        const [decimals, balance] = await Promise.all([
          citreaDecimals ??
            citreaClient.readContract({
              abi: erc20Abi,
              address: CITREA_WHITELABEL_ADDRESS,
              functionName: "decimals",
            }),
          citreaClient.readContract({
            abi: erc20Abi,
            address: CITREA_WHITELABEL_ADDRESS,
            functionName: "balanceOf",
            args: [accountAddress as HexAddress],
          }),
        ]);

        if (cancelled) {
          return;
        }

        if (citreaDecimals == null) {
          setCitreaDecimals(Number(decimals));
        }

        setCitreaBalance(balance as bigint);
      } catch (error) {
        if (!cancelled) {
          console.error("Citrea balance fetch error", error);
          setIsCitreaBalanceError(true);
        }
      } finally {
        if (!cancelled) {
          setIsCitreaBalanceLoading(false);
        }
      }
    };

    fetchBalance();

    return () => {
      cancelled = true;
    };
  }, [accountAddress, citreaClient, citreaDecimals, citreaFetchEnabled]);

  useEffect(() => {
    let cancelled = false;

    if (!citreaVaultFetchEnabled) {
      setCitreaVaultBalance(null);
      setIsCitreaVaultLoading(false);
      setIsCitreaVaultError(false);
      return;
    }

    setIsCitreaVaultLoading(true);
    setIsCitreaVaultError(false);

    const fetchBalance = async () => {
      try {
        const [decimals, balance] = await Promise.all([
          citreaVaultDecimals ??
            citreaClient.readContract({
              abi: erc20Abi,
              address: CITREA_VAULT_ADDRESS,
              functionName: "decimals",
            }),
          citreaClient.readContract({
            abi: erc20Abi,
            address: CITREA_VAULT_ADDRESS,
            functionName: "balanceOf",
            args: [accountAddress as HexAddress],
          }),
        ]);

        if (cancelled) {
          return;
        }

        if (citreaVaultDecimals == null) {
          setCitreaVaultDecimals(Number(decimals));
        }

        setCitreaVaultBalance(balance as bigint);
      } catch (error) {
        if (!cancelled) {
          console.error("Citrea vault balance fetch error", error);
          setIsCitreaVaultError(true);
        }
      } finally {
        if (!cancelled) {
          setIsCitreaVaultLoading(false);
        }
      }
    };

    fetchBalance();

    return () => {
      cancelled = true;
    };
  }, [
    accountAddress,
    citreaClient,
    citreaVaultDecimals,
    citreaVaultFetchEnabled,
  ]);

  useEffect(() => {
    const loadRecords = () => setLzBridgeRecords(loadLzBridgeRecords());
    loadRecords();

    const interval = window.setInterval(loadRecords, 15000);
    const handleStorage = (event: StorageEvent) => {
      if (event.key) {
        loadRecords();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(interval);
    };
  }, []);

  const citreaBalanceValue = useMemo(() => {
    if (!accountAddress) {
      return "—";
    }

    if (isCitreaBalanceLoading) {
      return "Loading…";
    }

    if (
      isCitreaBalanceError ||
      citreaBalance == null ||
      citreaDecimals == null
    ) {
      return "Unavailable";
    }

    return `${formatTokenAmount(formatUnits(citreaBalance, citreaDecimals), POSITION_PRECISION)} GUSD`.trim();
  }, [
    accountAddress,
    citreaBalance,
    citreaDecimals,
    isCitreaBalanceError,
    isCitreaBalanceLoading,
  ]);

  const citreaUsdValue = useMemo(() => {
    if (!accountAddress) {
      return "—";
    }

    if (isCitreaBalanceLoading) {
      return "Loading…";
    }

    if (isCitreaBalanceError || citreaBalance == null) {
      return "Unavailable";
    }

    return formatUsdFromToken(citreaBalance, citreaDecimals ?? null);
  }, [
    accountAddress,
    citreaBalance,
    citreaDecimals,
    isCitreaBalanceError,
    isCitreaBalanceLoading,
  ]);

  const hasCitreaBalance = (citreaBalance ?? BigInt(0)) > BigInt(0);
  const citreaVaultBalanceValue = useMemo(() => {
    if (!accountAddress) {
      return "—";
    }

    if (isCitreaVaultLoading) {
      return "Loading…";
    }

    if (
      isCitreaVaultError ||
      citreaVaultBalance == null ||
      citreaVaultDecimals == null
    ) {
      return "Unavailable";
    }

    return `${formatTokenAmount(formatUnits(citreaVaultBalance, citreaVaultDecimals), POSITION_PRECISION)} sGUSD`.trim();
  }, [
    accountAddress,
    citreaVaultBalance,
    citreaVaultDecimals,
    isCitreaVaultError,
    isCitreaVaultLoading,
  ]);
  const hasCitreaVaultBalance = (citreaVaultBalance ?? BigInt(0)) > BigInt(0);
  const pendingBridgeRecords = useMemo(() => {
    if (!accountAddress) {
      return [];
    }

    return lzBridgeRecords.filter(
      (record) =>
        record.account.toLowerCase() === accountAddress.toLowerCase() &&
        !isFinalLzStatus(record.status),
    );
  }, [accountAddress, lzBridgeRecords]);
  const pendingBridgeItems = pendingBridgeRecords.map((record) => ({
    key: `${record.txHash}-${record.direction}`,
    txHash: record.txHash,
    directionLabel:
      record.direction === "l1-to-citrea"
        ? "Ethereum → Citrea"
        : "Citrea → Ethereum",
    statusLabel: (record.status ?? "pending")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^./, (char) => char.toUpperCase()),
  }));

  const unitTokenValue = useMemo(
    () => formatTokenBalance(unitBalance, accountAddress),
    [accountAddress, unitBalance],
  );

  const gusdTokenValue = useMemo(
    () => formatTokenBalance(gusdBalance, accountAddress),
    [accountAddress, gusdBalance],
  );

  const gusdUsdValue = useMemo(() => {
    if (!accountAddress) {
      return "—";
    }

    if (gusdBalance.isLoading) {
      return "Loading…";
    }

    if (gusdBalance.isError || gusdBalance.data?.value == null) {
      return "Unavailable";
    }

    return formatUsdFromToken(gusdBalance.data.value, gusdDecimals ?? null);
  }, [accountAddress, gusdBalance, gusdDecimals]);

  const statusPredepositTokenValue = useMemo(() => {
    if (!accountAddress) {
      return "—";
    }

    if (isStatusPredepositLoading) {
      return "Loading…";
    }

    if (
      isStatusPredepositError ||
      statusPredepositAmount == null ||
      gusdDecimals == null
    ) {
      return "Unavailable";
    }

    return `${formatTokenAmount(formatUnits(statusPredepositAmount, gusdDecimals), POSITION_PRECISION)} GUSD`.trim();
  }, [
    accountAddress,
    gusdDecimals,
    isStatusPredepositError,
    isStatusPredepositLoading,
    statusPredepositAmount,
  ]);

  const statusPredepositUsdValue = useMemo(() => {
    if (!accountAddress) {
      return "—";
    }

    if (isStatusPredepositLoading) {
      return "Loading…";
    }

    if (isStatusPredepositError || statusPredepositAmount == null) {
      return "Unavailable";
    }

    return formatUsdFromToken(statusPredepositAmount, gusdDecimals ?? null);
  }, [
    accountAddress,
    gusdDecimals,
    isStatusPredepositError,
    isStatusPredepositLoading,
    statusPredepositAmount,
  ]);

  const zeroBigInt = BigInt(0);
  const hasUnits = (unitBalance.data?.value ?? zeroBigInt) > zeroBigInt;
  const hasGusd = (gusdBalance.data?.value ?? zeroBigInt) > zeroBigInt;
  const hasStatusPredeposit =
    (statusPredepositAmount ?? zeroBigInt) > zeroBigInt;
  const positionsCount = accountAddress
    ? [
        hasGusd,
        hasStatusPredeposit,
        hasCitreaBalance,
        hasCitreaVaultBalance,
      ].filter(Boolean).length
    : 0;
  const showEmptyState = positionsCount === 0;

  const scrollToDeposit = () => {
    const target = document.getElementById("deposit");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectOpportunity = (
    route: "mainnet" | "predeposit" | "citrea",
  ) => {
    setRoute(route);
    setFlow("deposit");
    scrollToDeposit();
  };

  return (
    <aside
      className={cn(
        "relative z-50 flex h-[520px] overflow-hidden rounded-l-3xl rounded-r-none border border-border/60 bg-card shadow-[0_30px_70px_-45px_rgba(15,23,42,0.55)] transition-[width] duration-300 ease-out",
        open ? "w-80" : "w-12",
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Portfolio
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
            {showEmptyState ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Opportunities
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectOpportunity("citrea")}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-background hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Citrea GUSD
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {!accountAddress
                          ? "Connect wallet to view"
                          : isCitreaBalanceLoading
                            ? "Loading…"
                            : isCitreaBalanceError
                              ? "Unavailable"
                              : hasCitreaBalance
                                ? `${citreaUsdValue} on Citrea`
                                : "Mint via bridge"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    Mint
                  </span>
                </button>
              </div>
            ) : null}

            <div className="space-y-3">
              {pendingBridgeItems.length ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Pending bridges
                  </p>
                  {pendingBridgeItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-border/60 bg-background/70 p-4 text-xs text-muted-foreground"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
                            {item.directionLabel}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Status: {item.statusLabel}
                          </p>
                        </div>
                        <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Pending
                        </span>
                      </div>
                      <a
                        href={`https://layerzeroscan.com/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80 transition hover:text-foreground"
                      >
                        View on LayerZeroScan
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Your positions
              </p>

              {hasGusd ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Droplet className="h-4 w-4" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                          Mainnet GUSD
                        </p>
                      </div>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {gusdUsdValue}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {gusdTokenValue}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <button
                        type="button"
                        onClick={() => handleSelectOpportunity("mainnet")}
                        className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold text-foreground/80 transition hover:border-primary/30 hover:bg-background hover:text-foreground"
                      >
                        Mint
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {hasCitreaBalance ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Sparkles className="h-4 w-4" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                          Citrea GUSD
                        </p>
                      </div>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {citreaUsdValue}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {citreaBalanceValue}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <button
                        type="button"
                        onClick={() => handleSelectOpportunity("citrea")}
                        className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold text-foreground/80 transition hover:border-primary/30 hover:bg-background hover:text-foreground"
                      >
                        Mint
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {hasCitreaVaultBalance ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Sparkles className="h-4 w-4" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                          Citrea sGUSD
                        </p>
                      </div>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {citreaVaultBalanceValue}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Vault shares
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <button
                        type="button"
                        onClick={() => handleSelectOpportunity("citrea")}
                        className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold text-foreground/80 transition hover:border-primary/30 hover:bg-background hover:text-foreground"
                      >
                        Stake
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {hasStatusPredeposit ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Lock className="h-4 w-4" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                          Status L2 predeposit
                        </p>
                      </div>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {statusPredepositUsdValue}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {statusPredepositTokenValue}
                      </p>
                      <p className="mt-2 whitespace-nowrap text-[10px] text-muted-foreground">
                        Unlocks when Status L2 goes live
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Locked
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {hasUnits ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Vault shares
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {unitTokenValue}
                  </p>
                </div>
              ) : null}

              {showEmptyState ? (
                <div className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/70 p-4 text-center text-sm text-muted-foreground">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    No positions yet
                  </span>
                  <span className="mt-2 text-xs font-medium text-muted-foreground/80">
                    Choose an opportunity to start earning
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Expand portfolio"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="group flex h-full w-full cursor-pointer flex-col items-center gap-3 px-2 py-4 text-left transition hover:bg-background/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition group-hover:border-primary/30 group-hover:bg-muted/60">
            <ChevronLeft className="h-4 w-4" />
          </span>
          <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow-sm">
            {positionsCount}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground [writing-mode:vertical-rl] [text-orientation:upright] group-hover:text-foreground">
            Portfolio
          </span>
          <div className="flex-1" />
        </button>
      )}
    </aside>
  );
}
