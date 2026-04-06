"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import type { MainnetVaultLiquidityResponse } from "@/lib/types/mainnet-vault-liquidity";

const REFRESH_INTERVAL_MS = 30_000;

type Params = {
  enabled: boolean;
  selectedTicker?: StablecoinTicker;
};

type Status = "idle" | "loading" | "ready" | "unavailable";

export function useRedeemVaultLiquidity({ enabled, selectedTicker }: Params) {
  const [data, setData] = useState<MainnetVaultLiquidityResponse | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dataRef = useRef<MainnetVaultLiquidityResponse | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refresh = useCallback(() => {
    setRefreshIndex((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setStatus("idle");
      setIsRefreshing(false);
      return;
    }

    void refreshIndex;

    let active = true;
    let currentController: AbortController | null = null;

    const load = async (background: boolean) => {
      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;
      const hasData = Boolean(dataRef.current);

      if (!background || !hasData) {
        setStatus("loading");
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await fetch("/api/mainnet/vault-liquidity", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Vault liquidity request failed");
        }

        const payload =
          (await response.json()) as MainnetVaultLiquidityResponse;

        if (!active) {
          return;
        }

        setData(payload);
        setStatus("ready");
      } catch (_error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        setStatus(hasData ? "ready" : "unavailable");
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    };

    void load(false);

    const interval = window.setInterval(() => {
      void load(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      currentController?.abort();
      window.clearInterval(interval);
    };
  }, [enabled, refreshIndex]);

  const selectedVault = useMemo(
    () => data?.vaults.find((vault) => vault.ticker === selectedTicker) ?? null,
    [data, selectedTicker],
  );

  return {
    data,
    status,
    isRefreshing,
    selectedVault,
    refresh,
  };
}
