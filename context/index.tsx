"use client";

import { arbitrum } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { type Config, cookieToInitialState, WagmiProvider } from "wagmi";

import { projectId, wagmiAdapter } from "@/config/wagmi";

const queryClient = new QueryClient();
const overrides: Record<string, string> = {
  "--apkt-tokens-core-backgroundAccentPrimary-base": "#0a0b0d",
  "--apkt-tokens-core-backgroundAccentPrimary": "#0a0b0d",
  "--apkt-tokens-core-textAccentPrimary": "#ffffff",
  "--apkt-fontFamily-regular": "var(--font-gilroy), system-ui, sans-serif",
  "--apkt-fontFamily-mono": "var(--font-geist-mono)",
  "--wui-font-family": "var(--font-gilroy), system-ui, sans-serif",
  "--wui-colors-accent-100": "#0a0b0d",
  "--wui-colors-fg-100": "#ffffff",
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
    networks: [arbitrum],
    defaultNetwork: arbitrum,
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

if (typeof window !== "undefined") {
  init();
}

type ContextProviderProps = {
  children: ReactNode;
  cookies: string | null;
};

export default function ContextProvider({
  children,
  cookies,
}: ContextProviderProps) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
