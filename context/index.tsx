"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  "--wui-colors-accent-100": "hsl(var(--primary))",
  "--apkt-tokens-core-backgroundAccentPrimary-base": "hsl(var(--primary))",
  "--apkt-tokens-core-backgroundAccentPrimary": "hsl(var(--primary))",
  "--apkt-tokens-core-textAccentPrimary": "hsl(var(--primary-foreground))",
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
    },
    themeMode: "light",
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

type OpportunityRouteContextValue = {
  route: OpportunityRoute;
  setRoute: (route: OpportunityRoute) => void;
};

const OPPORTUNITY_STORAGE_KEY = "generic.opportunityRoute";

const OpportunityRouteContext = React.createContext<
  OpportunityRouteContextValue | undefined
>(undefined);

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

  const [route, setRoute] = React.useState<OpportunityRoute>(
    DEFAULT_OPPORTUNITY_ROUTE,
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(OPPORTUNITY_STORAGE_KEY);
    if (
      stored === "citrea" ||
      stored === "predeposit" ||
      stored === "mainnet"
    ) {
      setRoute(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(OPPORTUNITY_STORAGE_KEY, route);
    applyOpportunityThemeToRoot(route);
  }, [route]);

  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  const value = React.useMemo(() => ({ route, setRoute }), [route]);

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
