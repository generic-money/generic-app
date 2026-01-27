"use client";

import { useEffect, useState } from "react";

const DEFAULT_ITEMS = [
  {
    symbol: "USDC",
    href: "https://etherscan.io/address/0x4825eFF24F9B7b76EEAFA2ecc6A1D5dFCb3c1c3f",
  },
  {
    symbol: "USDT",
    href: "https://etherscan.io/address/0xB8280955aE7b5207AF4CDbdCd775135Bd38157fE",
  },
  {
    symbol: "USDS",
    href: "https://etherscan.io/address/0x6133dA4Cd25773Ebd38542a8aCEF8F94cA89892A",
  },
];

type BreakdownItem = {
  symbol: string;
  percentFormatted: string;
};

export function MainnetCollateralBreakdown() {
  const [items, setItems] = useState<BreakdownItem[]>(
    DEFAULT_ITEMS.map((item) => ({ symbol: item.symbol, percentFormatted: "—" })),
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/mainnet/tvl");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          breakdown?: { symbol: string; percentFormatted: string }[];
        };
        if (!active || !data.breakdown) {
          return;
        }
        setItems(data.breakdown);
      } catch {
        // keep fallback
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mt-2 space-y-2">
      {DEFAULT_ITEMS.map((item) => {
        const match = items.find((entry) => entry.symbol === item.symbol);
        return (
          <div key={item.symbol} className="flex items-center justify-between gap-2">
            <span>
              {item.symbol} — {match?.percentFormatted ?? "—"}
            </span>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/70 underline-offset-2 transition hover:text-foreground hover:underline"
            >
              Vault contract
            </a>
          </div>
        );
      })}
    </div>
  );
}
