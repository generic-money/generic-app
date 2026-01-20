import { type AppKitNetwork, mainnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage } from "@wagmi/core";

// Get projectId from https://dashboard.reown.com
const rawProjectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!rawProjectId) {
  throw new Error("Project ID is not defined");
}

export const projectId = rawProjectId;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet];
export const defaultNetwork = mainnet;

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
