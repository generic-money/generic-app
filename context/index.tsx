"use client";

import { arbitrum } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { type Config, cookieToInitialState, WagmiProvider } from "wagmi";
import { projectId, wagmiAdapter } from "@/config/wagmi";

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
  name: "appkit-example",
  description: "AppKit Example",
  url: "https://appkitexampleapp.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Create the modal
let modal: ReturnType<typeof createAppKit> | null = null;

interface ContextProviderProps {
  children: ReactNode;
  cookies: string | null;
}

export default function ContextProvider({
  children,
  cookies,
}: ContextProviderProps) {
  useEffect(() => {
    if (!modal) {
      modal = createAppKit({
        adapters: [wagmiAdapter],
        projectId,
        networks: [arbitrum],
        defaultNetwork: arbitrum,
        metadata,
        features: {
          analytics: true, // Optional - defaults to your Cloud configuration
        },
        themeMode: "light",
      });
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const overrides: Record<string, string> = {
      "--apkt-tokens-core-backgroundAccentPrimary-base": "#0a0b0d",
      "--apkt-tokens-core-backgroundAccentPrimary": "#0a0b0d",
      "--apkt-tokens-core-textAccentPrimary": "#ffffff",
      "--apkt-fontFamily-regular": "var(--font-gilroy), system-ui, sans-serif",
      "--apkt-fontFamily-mono":
        "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
      "--wui-font-family": "var(--font-gilroy), system-ui, sans-serif",
      "--wui-colors-accent-100": "#0a0b0d",
      "--wui-colors-fg-100": "#ffffff",
    };

    Object.entries(overrides).forEach(([token, value]) => {
      root.style.setProperty(token, value, "important");
    });

    return () => {
      Object.keys(overrides).forEach((token) => {
        root.style.removeProperty(token);
      });
    };
  }, []);

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
