"use client";

import { useEffect, useState } from "react";

type MainnetTvlValueProps = {
  className?: string;
};

export function MainnetTvlValue({ className }: MainnetTvlValueProps) {
  const [value, setValue] = useState<string>("$— GUSD");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/mainnet/tvl");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { formatted?: string };
        if (!active) {
          return;
        }
        if (data.formatted) {
          setValue(`$${data.formatted} GUSD`);
        }
      } catch {
        // keep fallback
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return <span className={className}>{value}</span>;
}
