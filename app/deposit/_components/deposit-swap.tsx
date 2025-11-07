"use client";

import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { arbitrum } from "viem/chains";
import { useAccount, useBalance, useBlockNumber } from "wagmi";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import { gusd, stablecoins } from "@/lib/models/tokens";
import { SwapAssetPanel } from "./swap-asset-panel";

type AssetType = "stablecoin" | "gusd";

type BalanceResult = ReturnType<typeof useBalance>;

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
  const [selectedTicker, setSelectedTicker] = useState<StablecoinTicker>(
    stablecoins[0]?.ticker ?? "USDC",
  );
  const [isDepositFlow, setIsDepositFlow] = useState(true);
  const [fromAmount, setFromAmount] = useState("");

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

  const { data: latestBlockNumber } = useBlockNumber({
    chainId: arbitrum.id,
    watch: Boolean(accountAddress),
  });

  const stablecoinBalance = useBalance({
    address: accountAddress,
    token: selectedStablecoin?.tokenAddress,
    chainId: arbitrum.id,
    blockNumber: latestBlockNumber,
    query: {
      enabled: Boolean(accountAddress && selectedStablecoin?.tokenAddress),
    },
  });

  const gusdBalance = useBalance({
    address: accountAddress,
    token: gusdAddress,
    chainId: arbitrum.id,
    blockNumber: latestBlockNumber,
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

  const formatBalanceText = (balanceResult: BalanceResult) => {
    if (!accountAddress) {
      return "Balance: —";
    }

    if (balanceResult.isLoading) {
      return "Balance: loading…";
    }

    if (balanceResult.isError) {
      return "Balance: unavailable";
    }

    const formatted = balanceResult.data?.formatted;
    if (!formatted) {
      return "Balance: $0.00";
    }

    const numericValue = Number.parseFloat(formatted);
    if (!Number.isFinite(numericValue) || numericValue === 0) {
      return "Balance: $0.00";
    }

    if (numericValue < 0.0001) {
      return "Balance: <$0.0001";
    }

    const decimalPlaces = numericValue >= 1 ? 2 : 4;

    return `Balance: $${numericValue.toLocaleString("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    })}`;
  };

  const fromBalanceText = formatBalanceText(fromBalanceHook);
  const toBalanceText = formatBalanceText(toBalanceHook);
  const canUseMax =
    Boolean(accountAddress) && Boolean(fromBalanceHook.data?.formatted);

  const handleMaxClick = () => {
    const value = fromBalanceHook.data?.formatted;
    if (value) {
      setFromAmount(value);
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
              }}
              balance={{
                text: toBalanceText,
              }}
            />
          </div>
          <button
            type="button"
            className="h-11 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/95 text-sm font-semibold text-primary-foreground transition hover:from-primary/90 hover:via-primary/80 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isDepositFlow ? "Deposit" : "Redeem"}
          </button>
        </div>
      </div>
    </div>
  );
}
