"use client";

import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { erc20Abi, erc4626Abi } from "viem";
import { arbitrum } from "viem/chains";
import {
  useAccount,
  useBalance,
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
import { getGenericDepositorAddress } from "@/lib/constants/contracts";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import { gusd, stablecoins } from "@/lib/models/tokens";
import type { HexAddress } from "@/lib/types/address";
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

const TokenIcon = ({ src, alt }: { src: string; alt: string }) => (
  <Image
    src={src}
    alt={alt}
    width={20}
    height={20}
    loading="lazy"
    className="h-5 w-5 rounded-full"
  />
);

export function DepositSwap() {
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: arbitrum.id });
  const { writeContractAsync } = useWriteContract();
  const [selectedTicker, setSelectedTicker] = useState<StablecoinTicker>(
    stablecoins[0]?.ticker ?? "USDC",
  );
  const [isDepositFlow, setIsDepositFlow] = useState(true);
  const [fromAmount, setFromAmount] = useState("");
  const [txStep, setTxStep] = useState<"idle" | "approving" | "submitting">(
    "idle",
  );
  const [txError, setTxError] = useState<string | null>(null);

  const selectedStablecoin = useMemo(
    () =>
      stablecoins.find((coin) => coin.ticker === selectedTicker) ??
      stablecoins[0],
    [selectedTicker],
  );

  const handleSwitchDirection = () => {
    setIsDepositFlow((prev) => !prev);
  };

  const handleStablecoinChange = (value: StablecoinTicker) => {
    setSelectedTicker(value);
  };

  const gusdAddress = gusd.getAddress();

  const stablecoinAddress = selectedStablecoin?.tokenAddress;
  const vaultAddress = selectedStablecoin?.depositVaultAddress as
    | HexAddress
    | undefined;

  const { decimals: stablecoinDecimals } = useErc20Decimals(stablecoinAddress);
  const { decimals: gusdDecimals } = useErc20Decimals(gusdAddress);

  const depositorAddress = getGenericDepositorAddress();

  const stablecoinBalance = useBalance({
    address: accountAddress,
    token: selectedStablecoin?.tokenAddress,
    chainId: arbitrum.id,
    watch: Boolean(accountAddress && selectedStablecoin?.tokenAddress),
    query: {
      enabled: Boolean(accountAddress && selectedStablecoin?.tokenAddress),
    },
  });

  const gusdBalance = useBalance({
    address: accountAddress,
    token: gusdAddress,
    chainId: arbitrum.id,
    watch: Boolean(accountAddress && gusdAddress),
    query: {
      enabled: Boolean(accountAddress && gusdAddress),
    },
  });

  const fromBalanceHook = isDepositFlow ? stablecoinBalance : gusdBalance;
  const toBalanceHook = isDepositFlow ? gusdBalance : stablecoinBalance;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset amount when the active asset changes
  useEffect(() => {
    setFromAmount("");
  }, [selectedTicker, isDepositFlow]);

  const fromBalanceText = formatBalanceText(fromBalanceHook, accountAddress);
  const toBalanceText = formatBalanceText(toBalanceHook, accountAddress);
  const canUseMax =
    Boolean(accountAddress) && Boolean(fromBalanceHook.data?.formatted);

  const handleMaxClick = () => {
    const value = fromBalanceHook.data?.formatted;
    if (value) {
      setFromAmount(value);
    }
  };

  const fromDecimals = isDepositFlow ? stablecoinDecimals : gusdDecimals;
  const toDecimals = isDepositFlow ? gusdDecimals : stablecoinDecimals;

  const { quote: estimatedToAmount, parsedAmount } = useErc4626Preview({
    amount: fromAmount,
    fromDecimals,
    toDecimals,
    vaultAddress,
    mode: isDepositFlow ? "deposit" : "redeem",
  });

  const {
    allowance: depositAllowance,
    refetchAllowance: refetchDepositAllowance,
  } = useTokenAllowance({
    token: stablecoinAddress,
    owner: accountAddress,
    spender: depositorAddress,
  });

  const needsApproval = useMemo(() => {
    if (!parsedAmount || !isDepositFlow) {
      return false;
    }

    return depositAllowance < parsedAmount;
  }, [depositAllowance, isDepositFlow, parsedAmount]);

  const buttonState = useMemo(() => {
    const actionLabel = isDepositFlow ? "Deposit" : "Redeem";

    if (!accountAddress) {
      return { label: "Connect wallet", disabled: true };
    }

    if (isDepositFlow) {
      if (!stablecoinAddress) {
        return { label: "Select asset", disabled: true };
      }

      if (!depositorAddress) {
        return { label: "Depositor unavailable", disabled: true };
      }
    } else {
      if (!gusdAddress) {
        return { label: "GUSD unavailable", disabled: true };
      }

      if (!vaultAddress) {
        return { label: "Vault unavailable", disabled: true };
      }
    }

    if (!parsedAmount || parsedAmount <= 0n) {
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
      !stablecoinAddress ||
      !gusdAddress ||
      !parsedAmount ||
      parsedAmount <= 0n ||
      !depositorAddress ||
      !publicClient
    ) {
      return;
    }

    setTxError(null);

    try {
      if (depositAllowance < parsedAmount) {
        setTxStep("approving");
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: stablecoinAddress,
          chainId: arbitrum.id,
          functionName: "approve",
          args: [depositorAddress, parsedAmount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        await refetchDepositAllowance?.();
      }

      setTxStep("submitting");
      const depositHash = await writeContractAsync({
        abi: depositorAbi,
        address: depositorAddress,
        chainId: arbitrum.id,
        functionName: "deposit",
        args: [stablecoinAddress, gusdAddress, parsedAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

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
      setTxError(error instanceof Error ? error.message : "Transaction failed");
    } finally {
      setTxStep("idle");
    }
  };

  const handleRedeem = async () => {
    if (
      !accountAddress ||
      !vaultAddress ||
      !gusdAddress ||
      !parsedAmount ||
      parsedAmount <= 0n ||
      !publicClient
    ) {
      return;
    }

    setTxError(null);

    try {
      setTxStep("submitting");
      const unwrapHash = await writeContractAsync({
        abi: whitelabeledUnitAbi,
        address: gusdAddress,
        chainId: arbitrum.id,
        functionName: "unwrap",
        args: [accountAddress, accountAddress, parsedAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: unwrapHash });

      const redeemHash = await writeContractAsync({
        abi: erc4626Abi,
        address: vaultAddress,
        chainId: arbitrum.id,
        functionName: "redeem",
        args: [parsedAmount, accountAddress, accountAddress],
      });
      await publicClient.waitForTransactionReceipt({ hash: redeemHash });

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
      setTxError(error instanceof Error ? error.message : "Transaction failed");
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
