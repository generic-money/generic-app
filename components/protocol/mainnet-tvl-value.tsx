"use client";

import { useEffect, useState } from "react";
import { loadMainnetTvl } from "@/components/protocol/mainnet-tvl-data";

type MainnetTvlValueProps = {
  className?: string;
};

export function MainnetTvlValue({ className }: MainnetTvlValueProps) {
  const [value, setValue] = useState<string>("$— GUSD");

  useEffect(() => {
    let active = true;

    void loadMainnetTvl()
      .then((data) => {
        if (!active) {
          return;
        }
        if (data.formatted) {
          setValue(`$${data.formatted} GUSD`);
        }
      })
      .catch(() => {
        // keep fallback
      });
    return () => {
      active = false;
    };
  }, []);

  return <span className={className}>{value}</span>;
}
