"use client";

import { ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { erc20Abi, erc4626Abi } from "viem";
import {
  useAccount,
  useBalance,
  useBlockNumber,
  useChainId,
  usePublicClient,
  useWriteContract,
} from "wagmi";

import genericDepositorArtifact from "@/artifacts/GenericDepositorABI.sol.json";
import whitelabeledUnitArtifact from "@/artifacts/WhitelabeledUnitABI.sol.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pushAlert } from "@/lib/alerts";
import { getChainNameById } from "@/lib/constants/chains";
import {
  getGenericDepositorAddress,
  getGenericUnitTokenAddress,
} from "@/lib/constants/contracts";
import { PREDEPOSIT_CHAIN_NICKNAME } from "@/lib/constants/predeposit";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import { getStablecoins, gusd } from "@/lib/models/tokens";
import type { HexAddress } from "@/lib/types/address";
import { cn } from "@/lib/utils";
import { useErc20Decimals } from "./hooks/useErc20Decimals";
import { useErc4626Preview } from "./hooks/useErc4626Preview";
import { useTokenAllowance } from "./hooks/useTokenAllowance";
import { SwapAssetPanel } from "./swap-asset-panel";
import { formatBalanceText } from "./utils/format";

const depositorAbi =
  genericDepositorArtifact.abi as typeof genericDepositorArtifact.abi;
const whitelabeledUnitAbi =
  whitelabeledUnitArtifact.abi as typeof whitelabeledUnitArtifact.abi;

type AssetType = "stablecoin" | "gusd";
type DepositRoute = "predeposit" | "mainnet";
const ZERO_AMOUNT = BigInt(0);
type HexBytes = `0x${string}`;

const toBytes32 = (value: HexBytes) =>
  `0x${value.slice(2).padStart(64, "0")}` as const;

const formatTxHash = (hash: HexBytes) =>
  `${hash.slice(0, 6)}...${hash.slice(-4)}`;

const notifyTxSubmitted = (label: string, hash: HexBytes) => {
  pushAlert({
    type: "info",
    title: `${label} submitted`,
    message: `Hash ${formatTxHash(hash)}`,
  });
};

const notifyTxConfirmed = (label: string, hash: HexBytes) => {
  pushAlert({
    type: "success",
    title: `${label} confirmed`,
    message: `Hash ${formatTxHash(hash)}`,
  });
};

const TokenIcon = ({ src, alt }: { src: string; alt: string }) => (
  // biome-ignore lint/performance/noImgElement: token icons use local static assets and are not LCP-critical
  <img
    src={src}
    alt={alt}
    width={20}
    height={20}
    loading="lazy"
    decoding="async"
    className="h-5 w-5 rounded-full"
  />
);

const Chip = ({
  label,
  selected,
  onSelect,
  name,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  name: string;
}) => (
  <label
    className={cn(
      "inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible-within:outline-none focus-visible-within:ring-2 focus-visible-within:ring-ring focus-visible-within:ring-offset-2 focus-visible-within:ring-offset-background",
      selected
        ? "border-primary/40 bg-primary/10 text-foreground"
        : "border-border/60 bg-background/70 text-muted-foreground hover:bg-background/90 hover:text-foreground",
    )}
  >
    <input
      type="radio"
      name={name}
      checked={selected}
      onChange={onSelect}
      className="sr-only"
    />
    {label}
  </label>
);

export function DepositSwap() {
  const { address: accountAddress } = useAccount();
  const activeChainId = useChainId();
  const chainName = getChainNameById(activeChainId);
  const stablecoins = useMemo(() => getStablecoins(chainName), [chainName]);
  const publicClient = usePublicClient({ chainId: activeChainId });
  const { writeContractAsync } = useWriteContract();
  const { data: blockNumber } = useBlockNumber({
    chainId: activeChainId,
    watch: Boolean(accountAddress),
    query: {
      enabled: Boolean(accountAddress),
    },
  });
  const [selectedTicker, setSelectedTicker] =
    useState<StablecoinTicker>("USDC");
  const [isDepositFlow, setIsDepositFlow] = useState(true);
  const [depositRoute, setDepositRoute] = useState<DepositRoute>("mainnet");
  const [fromAmount, setFromAmount] = useState("");
  const [txStep, setTxStep] = useState<"idle" | "approving" | "submitting">(
    "idle",
  );
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    if (!stablecoins.find((coin) => coin.ticker === selectedTicker)) {
      setSelectedTicker(stablecoins[0]?.ticker ?? "USDC");
    }
  }, [selectedTicker, stablecoins]);

  const selectedStablecoin = useMemo(
    () =>
      stablecoins.find((coin) => coin.ticker === selectedTicker) ??
      stablecoins[0],
    [selectedTicker, stablecoins],
  );

  const handleSwitchDirection = () => {
    setIsDepositFlow((prev) => !prev);
  };

  const handleStablecoinChange = (value: StablecoinTicker) => {
    setSelectedTicker(value);
  };

  const gusdAddress = gusd.getAddress(chainName);

  const stablecoinAddress = selectedStablecoin?.tokenAddress;
  const vaultAddress = selectedStablecoin?.depositVaultAddress as
    | HexAddress
    | undefined;

  const { decimals: stablecoinDecimals } = useErc20Decimals(stablecoinAddress);
  const { decimals: gusdDecimals } = useErc20Decimals(gusdAddress);

  const isPredepositDeposit = isDepositFlow && depositRoute === "predeposit";

  const depositorAddress = getGenericDepositorAddress(chainName);
  const genericUnitTokenAddress = getGenericUnitTokenAddress(chainName);

  const stablecoinBalance = useBalance({
    address: accountAddress,
    token: selectedStablecoin?.tokenAddress,
    chainId: activeChainId,
    blockNumber,
    query: {
      enabled: Boolean(accountAddress && selectedStablecoin?.tokenAddress),
    },
  });

  const gusdBalance = useBalance({
    address: accountAddress,
    token: gusdAddress,
    chainId: activeChainId,
    blockNumber,
    query: {
      enabled: Boolean(accountAddress && gusdAddress),
    },
  });

  const fromAssetType: AssetType = isDepositFlow ? "stablecoin" : "gusd";

  const toAssetType: AssetType = isDepositFlow ? "gusd" : "stablecoin";

  const fromBalanceHook =
    fromAssetType === "stablecoin" ? stablecoinBalance : gusdBalance;
  const toBalanceHook =
    toAssetType === "stablecoin" ? stablecoinBalance : gusdBalance;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset amount when the active asset changes
  useEffect(() => {
    setFromAmount("");
  }, [selectedTicker, isDepositFlow, depositRoute, chainName]);

  const fromBalanceText = formatBalanceText(
    fromBalanceHook,
    accountAddress,
    fromAssetType === "gusd" ? { fixedDecimals: 2 } : undefined,
  );
  const toBalanceText = formatBalanceText(
    toBalanceHook,
    accountAddress,
    toAssetType === "gusd" ? { fixedDecimals: 2 } : undefined,
  );
  const canUseMax =
    Boolean(accountAddress) && Boolean(fromBalanceHook.data?.formatted);

  const handleMaxClick = () => {
    const value = fromBalanceHook.data?.formatted;
    if (value) {
      setFromAmount(value);
    }
  };

  const fromDecimals =
    fromAssetType === "stablecoin" ? stablecoinDecimals : gusdDecimals;
  const toDecimals =
    toAssetType === "stablecoin" ? stablecoinDecimals : gusdDecimals;

  const { quote: previewToAmount, parsedAmount } = useErc4626Preview({
    amount: fromAmount,
    fromDecimals,
    toDecimals,
    vaultAddress: isPredepositDeposit ? undefined : vaultAddress,
    mode: isDepositFlow ? "deposit" : "redeem",
  });

  const estimatedToAmount = isPredepositDeposit ? fromAmount : previewToAmount;

  const depositTokenAddress = stablecoinAddress;

  const {
    allowance: depositAllowance,
    refetchAllowance: refetchDepositAllowance,
  } = useTokenAllowance({
    token: isDepositFlow ? depositTokenAddress : undefined,
    owner: accountAddress,
    spender: depositorAddress,
  });

  const {
    allowance: redeemAllowance,
    refetchAllowance: refetchRedeemAllowance,
  } = useTokenAllowance({
    token: !isDepositFlow ? genericUnitTokenAddress : undefined,
    owner: accountAddress,
    spender: !isDepositFlow ? vaultAddress : undefined,
  });

  const needsDepositApproval = useMemo(() => {
    if (!parsedAmount || !isDepositFlow) {
      return false;
    }

    return depositAllowance < parsedAmount;
  }, [depositAllowance, isDepositFlow, parsedAmount]);

  const needsRedeemApproval = useMemo(() => {
    if (!parsedAmount || isDepositFlow) {
      return false;
    }

    return redeemAllowance < parsedAmount;
  }, [isDepositFlow, parsedAmount, redeemAllowance]);

  const needsApproval = isDepositFlow
    ? needsDepositApproval
    : needsRedeemApproval;

  const buttonState = useMemo(() => {
    const actionLabel = isDepositFlow
      ? isPredepositDeposit
        ? "Predeposit"
        : "Deposit"
      : "Redeem";

    if (!accountAddress) {
      return { label: "Connect wallet", disabled: true };
    }

    if (isDepositFlow) {
      if (!depositorAddress) {
        return { label: "Depositor unavailable", disabled: true };
      }

      if (isPredepositDeposit) {
        if (!stablecoinAddress) {
          return { label: "Select asset", disabled: true };
        }
      } else {
        if (!stablecoinAddress) {
          return { label: "Select asset", disabled: true };
        }

        if (!gusdAddress) {
          return { label: "GUSD unavailable", disabled: true };
        }
      }
    } else {
      if (!gusdAddress) {
        return { label: "GUSD unavailable", disabled: true };
      }

      if (!genericUnitTokenAddress) {
        return { label: "Generic unit unavailable", disabled: true };
      }

      if (!vaultAddress) {
        return { label: "Vault unavailable", disabled: true };
      }
    }

    if (!parsedAmount || parsedAmount <= ZERO_AMOUNT) {
      return { label: "Enter amount", disabled: true };
    }

    if (txStep === "approving") {
      return { label: "Approving…", disabled: true };
    }

    if (txStep === "submitting") {
      return { label: `${actionLabel}…`, disabled: true };
    }

    if (needsApproval) {
      return { label: `Approve & ${actionLabel}`, disabled: false };
    }

    return { label: actionLabel, disabled: false };
  }, [
    accountAddress,
    depositorAddress,
    gusdAddress,
    genericUnitTokenAddress,
    isPredepositDeposit,
    isDepositFlow,
    needsApproval,
    parsedAmount,
    stablecoinAddress,
    txStep,
    vaultAddress,
  ]);

  const handleDeposit = async () => {
    if (
      !accountAddress ||
      !parsedAmount ||
      parsedAmount <= ZERO_AMOUNT ||
      !depositorAddress ||
      !publicClient
    ) {
      return;
    }

    setTxError(null);

    try {
      if (depositAllowance < parsedAmount) {
        const approvalToken = stablecoinAddress;
        if (!approvalToken) {
          return;
        }

        setTxStep("approving");
        console.info("Deposit approval call", {
          functionName: "approve",
          address: approvalToken,
          chainId: activeChainId,
          args: [depositorAddress, parsedAmount],
          route: isPredepositDeposit ? "predeposit" : "mainnet",
        });
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: approvalToken,
          chainId: activeChainId,
          functionName: "approve",
          args: [depositorAddress, parsedAmount],
        });
        notifyTxSubmitted("Approval", approvalHash);
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        notifyTxConfirmed("Approval", approvalHash);
        await refetchDepositAllowance?.();
      }

      setTxStep("submitting");
      let depositHash: HexBytes;
      if (isPredepositDeposit) {
        if (!stablecoinAddress) {
          return;
        }
        const remoteRecipient = toBytes32(accountAddress);

        console.info("Predeposit call", {
          functionName: "depositAndPredeposit",
          address: depositorAddress,
          chainId: activeChainId,
          assets: parsedAmount,
          args: [
            stablecoinAddress,
            parsedAmount,
            PREDEPOSIT_CHAIN_NICKNAME,
            remoteRecipient,
          ],
        });
        depositHash = await writeContractAsync({
          abi: depositorAbi,
          address: depositorAddress,
          chainId: activeChainId,
          functionName: "depositAndPredeposit",
          args: [
            stablecoinAddress,
            parsedAmount,
            PREDEPOSIT_CHAIN_NICKNAME,
            remoteRecipient,
          ],
        });
      } else {
        if (!stablecoinAddress || !gusdAddress) {
          return;
        }
        console.info("Deposit call", {
          functionName: "deposit",
          address: depositorAddress,
          chainId: activeChainId,
          args: [stablecoinAddress, gusdAddress, parsedAmount],
        });
        depositHash = await writeContractAsync({
          abi: depositorAbi,
          address: depositorAddress,
          chainId: activeChainId,
          functionName: "deposit",
          args: [stablecoinAddress, gusdAddress, parsedAmount],
        });
      }
      notifyTxSubmitted(
        isPredepositDeposit ? "Predeposit" : "Deposit",
        depositHash,
      );
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      notifyTxConfirmed(
        isPredepositDeposit ? "Predeposit" : "Deposit",
        depositHash,
      );

      setFromAmount("");
      const balanceRefetches: Promise<unknown>[] = [];
      if (stablecoinBalance.refetch) {
        balanceRefetches.push(stablecoinBalance.refetch());
      }
      if (gusdBalance.refetch) {
        balanceRefetches.push(gusdBalance.refetch());
      }
      if (balanceRefetches.length) {
        await Promise.allSettled(balanceRefetches);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed";
      setTxError(message);
      pushAlert({
        type: "error",
        title: "Transaction failed",
        message,
      });
    } finally {
      setTxStep("idle");
    }
  };

  const handleRedeem = async () => {
    if (
      !accountAddress ||
      !vaultAddress ||
      !gusdAddress ||
      !genericUnitTokenAddress ||
      !parsedAmount ||
      parsedAmount <= ZERO_AMOUNT ||
      !publicClient
    ) {
      return;
    }

    setTxError(null);

    try {
      const balanceBefore = await publicClient.readContract({
        abi: erc20Abi,
        address: genericUnitTokenAddress,
        functionName: "balanceOf",
        args: [accountAddress],
      });

      setTxStep("submitting");
      console.info("Unwrap call", {
        functionName: "unwrap",
        address: gusdAddress,
        chainId: activeChainId,
        args: [accountAddress, accountAddress, parsedAmount],
      });
      const unwrapHash = await writeContractAsync({
        abi: whitelabeledUnitAbi,
        address: gusdAddress,
        chainId: activeChainId,
        functionName: "unwrap",
        args: [accountAddress, accountAddress, parsedAmount],
      });
      notifyTxSubmitted("Unwrap", unwrapHash);
      await publicClient.waitForTransactionReceipt({ hash: unwrapHash });
      notifyTxConfirmed("Unwrap", unwrapHash);

      const balanceAfter = await publicClient.readContract({
        abi: erc20Abi,
        address: genericUnitTokenAddress,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      const redeemShares = balanceAfter - balanceBefore;
      console.info("Generic unit balance", {
        before: balanceBefore,
        after: balanceAfter,
        delta: redeemShares,
      });

      if (redeemShares <= ZERO_AMOUNT) {
        setTxError("No generic unit tokens available to redeem");
        pushAlert({
          type: "warning",
          title: "Redeem unavailable",
          message: "No generic unit tokens available to redeem.",
        });
        return;
      }

      const currentAllowance = await publicClient.readContract({
        abi: erc20Abi,
        address: genericUnitTokenAddress,
        functionName: "allowance",
        args: [accountAddress, vaultAddress],
      });

      if (currentAllowance < redeemShares) {
        setTxStep("approving");
        console.info("Redeem approval call", {
          functionName: "approve",
          address: genericUnitTokenAddress,
          chainId: activeChainId,
          args: [vaultAddress, redeemShares],
        });
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: genericUnitTokenAddress,
          chainId: activeChainId,
          functionName: "approve",
          args: [vaultAddress, redeemShares],
        });
        notifyTxSubmitted("Approval", approvalHash);
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        notifyTxConfirmed("Approval", approvalHash);
        await refetchRedeemAllowance?.();
      }

      setTxStep("submitting");
      console.info("Redeem call", {
        functionName: "redeem",
        address: vaultAddress,
        chainId: activeChainId,
        args: [redeemShares, accountAddress, accountAddress],
      });
      const redeemHash = await writeContractAsync({
        abi: erc4626Abi,
        address: vaultAddress,
        chainId: activeChainId,
        functionName: "redeem",
        args: [redeemShares, accountAddress, accountAddress],
      });
      notifyTxSubmitted("Redeem", redeemHash);
      await publicClient.waitForTransactionReceipt({ hash: redeemHash });
      notifyTxConfirmed("Redeem", redeemHash);

      setFromAmount("");
      const balanceRefetches: Promise<unknown>[] = [];
      if (stablecoinBalance.refetch) {
        balanceRefetches.push(stablecoinBalance.refetch());
      }
      if (gusdBalance.refetch) {
        balanceRefetches.push(gusdBalance.refetch());
      }
      if (balanceRefetches.length) {
        await Promise.allSettled(balanceRefetches);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed";
      setTxError(message);
      pushAlert({
        type: "error",
        title: "Transaction failed",
        message,
      });
    } finally {
      setTxStep("idle");
    }
  };

  const handlePrimaryAction = async () => {
    if (isDepositFlow) {
      await handleDeposit();
    } else {
      await handleRedeem();
    }
  };

  const renderAssetSelector = (assetType: AssetType) => {
    if (assetType === "stablecoin") {
      return (
        <Select value={selectedTicker} onValueChange={handleStablecoinChange}>
          <SelectTrigger className="h-11 w-fit justify-start gap-2 px-3">
            {selectedStablecoin ? (
              <TokenIcon
                src={selectedStablecoin.iconUrl}
                alt={`${selectedStablecoin.ticker} icon`}
              />
            ) : null}
            <SelectValue
              placeholder="Select stablecoin"
              aria-label={selectedStablecoin?.ticker}
            />
          </SelectTrigger>
          <SelectContent>
            {stablecoins.map((coin) => (
              <SelectItem
                key={coin.ticker}
                value={coin.ticker}
                startContent={
                  <TokenIcon src={coin.iconUrl} alt={`${coin.ticker} icon`} />
                }
              >
                {coin.ticker}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-background/80 px-3 text-sm font-medium text-foreground">
        <TokenIcon src={gusd.iconUrl} alt="GUSD icon" />
        <span>GUSD</span>
      </div>
    );
  };

  return (
    <div className="w-full px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl justify-center">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border/60 bg-card/60 p-8 shadow-[0_35px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            <span>{isDepositFlow ? "Deposit" : "Redeem"}</span>
            <span>Vault</span>
          </div>
          <div className="flex flex-col gap-4">
            <SwapAssetPanel
              label="From"
              selector={renderAssetSelector(
                isDepositFlow ? "stablecoin" : "gusd",
              )}
              inputProps={{
                placeholder: isDepositFlow
                  ? `Amount in ${selectedStablecoin?.ticker ?? ""}`
                  : "Amount in GUSD",
                autoComplete: "off",
                value: fromAmount,
                onChange: (event) => setFromAmount(event.target.value),
              }}
              balance={{
                text: fromBalanceText,
                interactive: canUseMax,
                onClick: canUseMax ? handleMaxClick : undefined,
              }}
            />
            <button
              type="button"
              onClick={handleSwitchDirection}
              aria-label="Switch direction"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
            <SwapAssetPanel
              label="To"
              selector={renderAssetSelector(
                isDepositFlow ? "gusd" : "stablecoin",
              )}
              inputProps={{
                placeholder: isDepositFlow
                  ? "Amount in GUSD"
                  : `Amount in ${selectedStablecoin?.ticker ?? ""}`,
                disabled: true,
                readOnly: true,
                value: estimatedToAmount,
              }}
              balance={{
                text: toBalanceText,
              }}
            />
          </div>
          {isDepositFlow ? (
            <fieldset className="flex flex-wrap items-center justify-center gap-2">
              <legend className="sr-only">Deposit route</legend>
              <Chip
                label="Status Predeposit"
                selected={depositRoute === "predeposit"}
                name="deposit-route"
                onSelect={() => setDepositRoute("predeposit")}
              />
              <Chip
                label="Mainnet"
                selected={depositRoute === "mainnet"}
                name="deposit-route"
                onSelect={() => setDepositRoute("mainnet")}
              />
            </fieldset>
          ) : null}
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={buttonState.disabled}
            className="h-11 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/95 text-sm font-semibold text-primary-foreground transition hover:from-primary/90 hover:via-primary/80 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonState.label}
          </button>
          {txError ? (
            <p className="text-center text-xs text-destructive">{txError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
