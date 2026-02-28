"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import * as React from "react";
import { type Config, cookieToInitialState, WagmiProvider } from "wagmi";
import {
  defaultNetwork,
  networks,
  projectId,
  wagmiAdapter,
} from "@/config/wagmi";
import {
  DEFAULT_OPPORTUNITY_ROUTE,
  getOpportunityTheme,
  type OpportunityRoute,
} from "@/lib/constants/opportunity-theme";

const queryClient = new QueryClient();
const overrides: Record<string, string> = {
  "--apkt-fontFamily-regular": "var(--font-gilroy), system-ui, sans-serif",
  "--apkt-fontFamily-mono": "var(--font-geist-mono)",
  "--wui-font-family": "var(--font-gilroy), system-ui, sans-serif",
  "--wui-colors-accent-100": "#0a0b0d",
  "--apkt-tokens-core-backgroundAccentPrimary-base": "#0a0b0d",
  "--apkt-tokens-core-backgroundAccentPrimary": "#0a0b0d",
  "--apkt-tokens-core-textAccentPrimary": "#ffffff",
};

if (!projectId) {
  throw new Error("Project ID is not defined");
}

let initialized = false;

const init = () => {
  if (typeof window === "undefined" || initialized) {
    return;
  }

  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    defaultNetwork,
    metadata: {
      name: "Generic Money",
      description: "Generic Money dApp",
      url: window.location.origin,
      icons: [`${window.location.origin}/Icon.svg`],
    },
    features: {
      analytics: true,
      legalCheckbox: true,
    },
    termsConditionsUrl: `${window.location.origin}/terms-and-conditions`,
    themeMode: "light",
    themeVariables: {
      "--w3m-accent": "#0a0b0d",
      "--apkt-accent": "#0a0b0d",
      "--w3m-font-family": "var(--font-gilroy), system-ui, sans-serif",
      "--apkt-font-family": "var(--font-gilroy), system-ui, sans-serif",
    },
  });

  const root = document.documentElement;
  Object.entries(overrides).forEach(([token, value]) => {
    root.style.setProperty(token, value, "important");
  });

  initialized = true;
};

type ContextProviderProps = {
  children: React.ReactNode;
  cookies: string | null;
};

type SwapFlow = "deposit" | "redeem";
export type RedeemSource = "gusd" | "gunit";
export type RedeemPrefill = "none" | "max";

export type RedeemEntryRequest = {
  id: number;
  source: RedeemSource;
  prefill: RedeemPrefill;
};

type OpportunityRouteContextValue = {
  route: OpportunityRoute;
  setRoute: (route: OpportunityRoute) => void;
  flow: SwapFlow;
  setFlow: (flow: SwapFlow) => void;
  redeemEntryRequest: RedeemEntryRequest | null;
  requestRedeemEntry: (source: RedeemSource, prefill?: RedeemPrefill) => void;
};

const OPPORTUNITY_STORAGE_KEY = "generic.opportunityRoute";
const SWAP_FLOW_STORAGE_KEY = "generic.swapFlow";

const OpportunityRouteContext = React.createContext<
  OpportunityRouteContextValue | undefined
>(undefined);

const getOpportunityRouteFromUrl = (
  pathname: string | null | undefined,
  hash: string | null | undefined,
): OpportunityRoute | null => {
  const normalizedHash = (hash ?? "").replace(/^#/, "").trim().toLowerCase();

  const normalizedPath = (pathname ?? "")
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean)[0]
    ?.trim()
    .toLowerCase();

  const slug = normalizedHash || normalizedPath;

  if (slug === "citrea") {
    return "citrea";
  }

  if (slug === "status" || slug === "predeposit") {
    return "predeposit";
  }

  return null;
};

export const useOpportunityRoute = () => {
  const value = React.useContext(OpportunityRouteContext);
  if (!value) {
    throw new Error("useOpportunityRoute must be used within ContextProvider");
  }
  return value;
};

const applyOpportunityThemeToRoot = (route: OpportunityRoute) => {
  const root = document.documentElement;
  const theme = getOpportunityTheme(route);

  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-foreground", theme.primaryForeground);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--ring", theme.ring);
};

export default function ContextProvider({
  children,
  cookies,
}: ContextProviderProps) {
  React.useEffect(() => {
    init();
  }, []);

  const pathname = usePathname();

  const [route, setRoute] = React.useState<OpportunityRoute>(
    DEFAULT_OPPORTUNITY_ROUTE,
  );
  const [flow, setFlow] = React.useState<SwapFlow>("deposit");
  const [redeemEntryRequest, setRedeemEntryRequest] =
    React.useState<RedeemEntryRequest | null>(null);
  const redeemEntryRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const routeFromUrl = getOpportunityRouteFromUrl(
      pathname,
      window.location.hash,
    );

    if (routeFromUrl) {
      setRoute(routeFromUrl);
      setFlow("deposit");
      return;
    }

    const storedRoute = window.localStorage.getItem(OPPORTUNITY_STORAGE_KEY);
    if (storedRoute === "citrea" || storedRoute === "predeposit") {
      setRoute(storedRoute);
      setFlow("deposit");
      return;
    }

    const storedFlow = window.localStorage.getItem(SWAP_FLOW_STORAGE_KEY);
    if (storedFlow === "deposit" || storedFlow === "redeem") {
      setFlow(storedFlow);
    }
  }, [pathname]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      const routeFromHash = getOpportunityRouteFromUrl(
        window.location.pathname,
        window.location.hash,
      );

      if (!routeFromHash) {
        return;
      }

      setRoute(routeFromHash);
      setFlow("deposit");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(OPPORTUNITY_STORAGE_KEY, route);
    applyOpportunityThemeToRoot(route);
  }, [route]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SWAP_FLOW_STORAGE_KEY, flow);
  }, [flow]);

  const requestRedeemEntry = React.useCallback(
    (source: RedeemSource, prefill: RedeemPrefill = "none") => {
      redeemEntryRequestIdRef.current += 1;
      setRedeemEntryRequest({
        id: redeemEntryRequestIdRef.current,
        source,
        prefill,
      });
    },
    [],
  );

  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  const value = React.useMemo(
    () => ({
      route,
      setRoute,
      flow,
      setFlow,
      redeemEntryRequest,
      requestRedeemEntry,
    }),
    [flow, redeemEntryRequest, requestRedeemEntry, route],
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <OpportunityRouteContext.Provider value={value}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </OpportunityRouteContext.Provider>
    </WagmiProvider>
  );
}
