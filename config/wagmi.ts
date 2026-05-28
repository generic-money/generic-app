import { type AppKitNetwork, mainnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "viem";
import { cookieStorage, createStorage } from "wagmi";

// Get projectId from https://dashboard.reown.com
const rawProjectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!rawProjectId) {
  throw new Error("Project ID is not defined");
}

export const projectId = rawProjectId;

const citrea = defineChain({
  id: 4114,
  name: "Citrea",
  network: "citrea",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.citrea.xyz"] },
    public: { http: ["https://rpc.mainnet.citrea.xyz"] },
  },
});

const linea = defineChain({
  id: 59144,
  name: "Linea",
  network: "linea",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.linea.build"] },
    public: { http: ["https://rpc.linea.build"] },
  },
  blockExplorers: {
    default: {
      name: "LineaScan",
      url: "https://lineascan.build",
    },
  },
});

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  citrea,
  linea,
];
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
