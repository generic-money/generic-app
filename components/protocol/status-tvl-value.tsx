"use client";

import { useEffect, useState } from "react";

type StatusTvlResponse = {
  formatted?: string;
};

export function StatusTvlValue() {
  const [value, setValue] = useState<string>("$— GUSD");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/status/tvl");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as StatusTvlResponse;
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

  return <span>{value}</span>;
}
