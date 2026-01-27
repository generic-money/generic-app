"use client";

import * as React from "react";
import { modal } from "@reown/appkit/react";
import { useAccount, useEnsName } from "wagmi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

type WalletButtonProps = {
  className?: string;
};

export function WalletButton({ className }: WalletButtonProps) {
  const { address, connector, isConnected, isConnecting, isReconnecting } =
    useAccount();
  const { data: ensName } = useEnsName({
    address,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });
  const hasActiveConnector = Boolean(connector);
  const showConnecting = isConnecting && hasActiveConnector && !address;
  const showReconnecting = isReconnecting && hasActiveConnector && !address;
  const displayLabel =
    isConnected && address ? ensName ?? formatAddress(address) : null;
  const label = isConnected && address
    ? displayLabel ?? formatAddress(address)
    : showReconnecting
      ? "Reconnecting..."
      : showConnecting
        ? "Connecting..."
        : "Connect wallet";

  const handleClick = React.useCallback(() => {
    if (!modal) {
      return;
    }

    modal.open();
  }, []);

  if (isConnected && address) {
    return (
      <a
        href="#"
        className={cn(
          "text-sm font-semibold text-[#0a0b0d] underline decoration-[#0a0b0d]/35 decoration-2 underline-offset-4 transition hover:text-[#0a0b0d]/80 hover:decoration-[#0a0b0d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className,
        )}
        aria-label={`Wallet ${displayLabel ?? address}`}
        onClick={(event) => {
          event.preventDefault();
          handleClick();
        }}
      >
        {label}
      </a>
    );
  }

  return (
    <Button
      className={cn(
        "h-9 rounded-full bg-[#0a0b0d] px-4 text-white hover:bg-[#0a0b0d]/90",
        className,
      )}
      aria-label={isConnected && address ? `Wallet ${address}` : "Connect wallet"}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
