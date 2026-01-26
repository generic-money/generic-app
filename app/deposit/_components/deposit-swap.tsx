"use client";

import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  erc20Abi,
  erc4626Abi,
  formatUnits,
  type PublicClient,
  parseUnits,
} from "viem";
import {
  useAccount,
  useBalance,
  useBlockNumber,
  useChainId,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import genericDepositorArtifact from "@/artifacts/GenericDepositorABI.sol.json";
import whitelabeledUnitArtifact from "@/artifacts/WhitelabeledUnitABI.sol.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpportunityRoute } from "@/context";
import { pushAlert } from "@/lib/alerts";
import { CHAINS, getChainNameById } from "@/lib/constants/chains";
import {
  getGenericDepositorAddress,
  getGenericUnitTokenAddress,
} from "@/lib/constants/contracts";
import {
  getOpportunityHref,
  OPPORTUNITY_APY_CAP,
  OPPORTUNITY_THEME,
  type OpportunityRoute,
} from "@/lib/constants/opportunity-theme";
import {
  getBridgeCoordinatorAddress,
  getPredepositChainNickname,
} from "@/lib/constants/predeposit";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import {
  fetchLzMessageStatus,
  isFinalLzStatus,
  type LzBridgeRecord,
  loadLzBridgeRecords,
  pruneLzBridgeRecords,
  saveLzBridgeRecords,
  upsertLzBridgeRecord,
} from "@/lib/layerzero/scan";
import { getStablecoins, gusd } from "@/lib/models/tokens";
import { type HexAddress, ZERO_ADDRESS } from "@/lib/types/address";
import { cn } from "@/lib/utils";
import { useErc20Decimals } from "./hooks/useErc20Decimals";
import { useErc4626Preview } from "./hooks/useErc4626Preview";
import { useTokenAllowance } from "./hooks/useTokenAllowance";
import { SwapAssetPanel } from "./swap-asset-panel";
import { formatBalanceText, formatTokenAmount } from "./utils/format";

const depositorAbi =
  genericDepositorArtifact.abi as typeof genericDepositorArtifact.abi;
const whitelabeledUnitAbi =
  whitelabeledUnitArtifact.abi as typeof whitelabeledUnitArtifact.abi;

const bridgeCoordinatorL2Abi = [
  {
    type: "function",
    name: "encodeBridgeMessage",
    stateMutability: "pure",
    inputs: [
      {
        name: "message",
        type: "tuple",
        components: [
          { name: "sender", type: "bytes32" },
          { name: "recipient", type: "bytes32" },
          { name: "sourceWhitelabel", type: "bytes32" },
          { name: "destinationWhitelabel", type: "bytes32" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    type: "function",
    name: "bridge",
    stateMutability: "payable",
    inputs: [
      { name: "bridgeType", type: "uint16" },
      { name: "chainId", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "remoteRecipient", type: "bytes32" },
      { name: "sourceWhitelabel", type: "address" },
      { name: "destinationWhitelabel", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "bridgeParams", type: "bytes" },
    ],
    outputs: [{ name: "messageId", type: "bytes32" }],
  },
] as const;

const layerZeroAdapterAbi = [
  {
    type: "function",
    name: "estimateBridgeFee",
    stateMutability: "view",
    inputs: [
      { name: "chainId", type: "uint256" },
      { name: "message", type: "bytes" },
      { name: "bridgeParams", type: "bytes" },
    ],
    outputs: [{ name: "nativeFee", type: "uint256" }],
  },
] as const;

const bridgeCoordinatorPredepositAbi = [
  {
    type: "function",
    name: "getPredeposit",
    stateMutability: "view",
    inputs: [
      { name: "chainNickname", type: "bytes32" },
      { name: "sender", type: "address" },
      { name: "remoteRecipient", type: "bytes32" },
    ],
    outputs: [{ name: "amount", type: "uint256" }],
  },
] as const;

type AssetType = "stablecoin" | "gusd";
const ZERO_AMOUNT = BigInt(0);
type HexBytes = `0x${string}`;
type HexData = `0x${string}`;
type BridgeMessage = {
  sender: HexBytes;
  recipient: HexBytes;
  sourceWhitelabel: HexBytes;
  destinationWhitelabel: HexBytes;
  amount: bigint;
};
type TokenBalanceLike = {
  isLoading: boolean;
  isError: boolean;
  data?: {
    formatted?: string;
    symbol?: string;
    value?: bigint;
  } | null;
};

const MAINNET_CHAIN_ID = 1;
const CITREA_CHAIN_ID_NUMBER = 4114;
const CITREA_BRIDGE_TYPE = 1;
const CITREA_CHAIN_ID = BigInt(CITREA_CHAIN_ID_NUMBER);
const L1_CHAIN_ID = BigInt(1);
const LZ_EID_ETHEREUM = 30101;
const LZ_EID_CITREA = 30403;
const ENABLE_LZ_LOGS = process.env.NODE_ENV !== "production";
const BRIDGE_COORDINATOR_L2_ADDRESS =
  "0x6E810122C2B7d474Ef568bdf221ec05f2dC8063A" as const satisfies HexAddress;
const BRIDGE_COORDINATOR_L1_ADDRESS = getBridgeCoordinatorAddress(
  CHAINS.MAINNET,
);
const LZ_ADAPTER_L1_ADDRESS =
  "0x05a166797e784d49Ba880b289647eCcB29B0144e" as const satisfies HexAddress;
const LZ_ADAPTER_L2_ADDRESS =
  "0xf056d4F903E53432873bFD0DA32f9d6fCb92825c" as const satisfies HexAddress;
const CITREA_WHITELABEL_ADDRESS =
  "0xAC8c1AEB584765DB16ac3e08D4736CFcE198589B" as const satisfies HexAddress;
const CITREA_WHITELABEL =
  "0x000000000000000000000000ac8c1aeb584765db16ac3e08d4736cfce198589b" as const satisfies HexBytes;
const CITREA_VAULT_ADDRESS =
  "0x5cA6Cb90b9E30B701a6036537f7576FAD1f247E9" as const satisfies HexAddress;
const CITREA_BRIDGE_PARAMS = "0x" as const satisfies HexData;

const toBytes32 = (value: HexBytes) =>
  `0x${value.slice(2).padStart(64, "0")}` as const;

const formatTxHash = (hash: HexBytes) =>
  `${hash.slice(0, 6)}...${hash.slice(-4)}`;

const formatTokenBalanceText = (
  balance: TokenBalanceLike,
  accountAddress?: string,
  fallbackSymbol = "",
) => {
  if (!accountAddress) {
    return "Balance: —";
  }

  if (balance.isLoading) {
    return "Balance: loading…";
  }

  if (balance.isError) {
    return "Balance: unavailable";
  }

  const formatted = balance.data?.formatted;
  if (!formatted) {
    return `Balance: 0 ${fallbackSymbol}`.trim();
  }

  const symbol = balance.data?.symbol ?? fallbackSymbol;
  return `Balance: ${formatTokenAmount(formatted, 6)} ${symbol}`.trim();
};

const estimateLzBridgeFee = async ({
  client,
  bridgeCoordinatorAddress,
  adapterAddress,
  destinationChainId,
  bridgeParams,
  message,
}: {
  client: PublicClient | null | undefined;
  bridgeCoordinatorAddress: HexAddress;
  adapterAddress: HexAddress;
  destinationChainId: bigint;
  bridgeParams: HexData;
  message: BridgeMessage;
}) => {
  if (!client) {
    return null;
  }

  const encodedMessage = await client.readContract({
    abi: bridgeCoordinatorL2Abi,
    address: bridgeCoordinatorAddress,
    functionName: "encodeBridgeMessage",
    args: [message],
  });

  return client.readContract({
    abi: layerZeroAdapterAbi,
    address: adapterAddress,
    functionName: "estimateBridgeFee",
    args: [destinationChainId, encodedMessage, bridgeParams],
  });
};

const notifyTxSubmitted = (label: string, hash: HexBytes) => {
  pushAlert({
    type: "info",
    title: `${label} submitted`,
    message: `Hash ${formatTxHash(hash)}`,
  });
};

const notifyTxConfirmed = (label: string, hash: HexBytes) => {
  pushAlert({
    type: "success",
    title: `${label} confirmed`,
    message: `Hash ${formatTxHash(hash)}`,
  });
};

const TokenIcon = ({ src, alt }: { src: string; alt: string }) => (
  // biome-ignore lint/performance/noImgElement: token icons use local static assets and are not LCP-critical
  <img
    src={src}
    alt={alt}
    width={20}
    height={20}
    loading="lazy"
    decoding="async"
    className="h-5 w-5 shrink-0 rounded-full"
  />
);

const ChainIcon = ({ src, alt }: { src: string; alt: string }) => (
  <Image
    src={src}
    alt={alt}
    width={32}
    height={32}
    sizes="32px"
    className="h-[32px] w-[32px] object-cover"
  />
);

type OpportunityOption = {
  value: OpportunityRoute;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  formDescription: string;
  iconSrc?: string;
  iconAlt?: string;
};

const OPPORTUNITY_OPTIONS: OpportunityOption[] = [
  {
    value: "citrea",
    eyebrow: "Citrea GUSD",
    title: "Join the OGs with Citrea",
    description: "Citrea-native GUSD for DeFi power users",
    note: "L2-native settlement",
    formDescription: "Mint Citrea-native GUSD with stablecoins",
    iconSrc: "/chains/citrea.png",
    iconAlt: "Citrea",
  },
  {
    value: "predeposit",
    eyebrow: "Status L2 GUSD",
    title: "Predeposit for Status L2",
    description: "Lock funds for Status L2 launch with zero penalties",
    note: "Unlocks at launch",
    formDescription: "Lock stablecoins now to mint once Status L2 goes live",
    iconSrc: "/chains/status.png",
    iconAlt: "Status",
  },
  {
    value: "mainnet",
    eyebrow: "Mainnet GUSD",
    title: "Mainnet GUSD — safe, simple yield",
    description: "Direct mainnet minting with immediate access",
    note: "Mainnet security",
    formDescription: "Mint GUSD on mainnet with stablecoins",
  },
];

const OpportunityCard = ({
  option,
  selected,
  onSelect,
  name,
}: {
  option: OpportunityOption;
  selected: boolean;
  onSelect: () => void;
  name: string;
}) => {
  const optionTone = OPPORTUNITY_THEME[option.value];
  const style = {
    "--opportunity-color": optionTone.primary,
  } as CSSProperties;

  return (
    <label
      style={style}
      className={cn(
        "group flex w-full max-w-[20.5rem] cursor-pointer flex-col rounded-xl border px-4 py-3 shadow-sm transition-all focus-visible-within:outline-none focus-visible-within:ring-2 focus-visible-within:ring-ring focus-visible-within:ring-offset-2 focus-visible-within:ring-offset-background",
        selected
          ? "border-primary/50 bg-primary/10 shadow-[0_18px_35px_-30px_rgba(37,99,235,0.5)]"
          : "border-border/70 bg-background/70 hover:-translate-y-0.5 hover:border-[hsl(var(--opportunity-color))] hover:bg-background hover:shadow-md",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {option.eyebrow}
        </span>
        {option.iconSrc ? (
          <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/70 shadow-sm">
            <ChainIcon src={option.iconSrc} alt={option.iconAlt ?? ""} />
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex min-h-[92px] flex-1 flex-col">
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
            {option.title}
          </h3>
          <p className="line-clamp-2 min-h-[32px] text-xs text-muted-foreground">
            {option.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between text-[11px] font-semibold text-foreground/70">
          <span className="whitespace-nowrap rounded-full border border-border/60 bg-background/70 px-2.5 py-0.5">
            Up to {OPPORTUNITY_APY_CAP[option.value]} APY
          </span>
          <span className="whitespace-nowrap text-muted-foreground">
            {option.note}
          </span>
        </div>
      </div>
    </label>
  );
};

export function DepositSwap() {
  const { address: accountAddress } = useAccount();
  const activeChainId = useChainId();
  const chainName = getChainNameById(activeChainId);
  const stablecoins = useMemo(() => getStablecoins(chainName), [chainName]);
  const publicClient = usePublicClient({ chainId: activeChainId });
  const mainnetClient = usePublicClient({ chainId: MAINNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { data: blockNumber } = useBlockNumber({
    chainId: activeChainId,
    watch: Boolean(accountAddress),
    query: {
      enabled: Boolean(accountAddress),
    },
  });
  const [selectedTicker, setSelectedTicker] =
    useState<StablecoinTicker>("USDC");
  const {
    route: depositRoute,
    setRoute: setDepositRoute,
    flow,
    setFlow,
  } = useOpportunityRoute();
  const isDepositFlow = flow === "deposit";
  const isCitreaReturnFlow = !isDepositFlow && depositRoute === "citrea";
  const isPredepositRedeem = !isDepositFlow && depositRoute === "predeposit";
  const requiredChainId = isCitreaReturnFlow
    ? CITREA_CHAIN_ID_NUMBER
    : MAINNET_CHAIN_ID;
  const requiredChainLabel = isCitreaReturnFlow ? "Citrea" : "Ethereum";
  const isOnRequiredChain = activeChainId === requiredChainId;
  const shouldSwitchChain = Boolean(accountAddress) && !isOnRequiredChain;
  const [fromAmount, setFromAmount] = useState("");
  const [txStep, setTxStep] = useState<"idle" | "approving" | "submitting">(
    "idle",
  );
  const [txError, setTxError] = useState<string | null>(null);
  const [postMintHref, setPostMintHref] = useState<string | null>(null);
  const [stakeAfterBridge, setStakeAfterBridge] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakeAmountTouched, setStakeAmountTouched] = useState(false);
  const [pendingStakeAmount, setPendingStakeAmount] = useState<bigint | null>(
    null,
  );
  const [bridgeStakeState, setBridgeStakeState] = useState<
    "idle" | "bridging" | "waiting" | "ready" | "staking" | "complete" | "error"
  >("idle");
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [citreaBalanceBaseline, setCitreaBalanceBaseline] = useState<
    bigint | null
  >(null);
  const [autoSwitchRequested, setAutoSwitchRequested] = useState(false);
  const [stakePanelShifted, setStakePanelShifted] = useState(false);
  const [stakePanelVisible, setStakePanelVisible] = useState(false);
  const [lzBridgeRecords, setLzBridgeRecords] = useState<LzBridgeRecord[]>([]);

  useEffect(() => {
    if (!stablecoins.find((coin) => coin.ticker === selectedTicker)) {
      setSelectedTicker(stablecoins[0]?.ticker ?? "USDC");
    }
  }, [selectedTicker, stablecoins]);

  const selectedStablecoin = useMemo(
    () =>
      stablecoins.find((coin) => coin.ticker === selectedTicker) ??
      stablecoins[0],
    [selectedTicker, stablecoins],
  );

  const selectedOpportunity = useMemo(
    () =>
      OPPORTUNITY_OPTIONS.find((option) => option.value === depositRoute) ??
      OPPORTUNITY_OPTIONS[0],
    [depositRoute],
  );

  const formDescription = isDepositFlow
    ? selectedOpportunity.formDescription
    : isCitreaReturnFlow
      ? "Bridge Citrea GUSD back to mainnet."
      : isPredepositRedeem
        ? "Status predeposits are locked until launch."
        : "Redeem GUSD back into your selected stablecoin.";

  const canSwitchDirection = !isDepositFlow || depositRoute !== "predeposit";

  const handleSwitchDirection = () => {
    if (!canSwitchDirection) {
      return;
    }

    setPostMintHref(null);
    setFlow(isDepositFlow ? "redeem" : "deposit");
  };

  const handleStablecoinChange = (value: StablecoinTicker) => {
    setPostMintHref(null);
    setSelectedTicker(value);
  };

  const l1GusdAddress = gusd.getAddress(chainName);
  const gusdAddress = isCitreaReturnFlow
    ? CITREA_WHITELABEL_ADDRESS
    : l1GusdAddress;

  const stablecoinAddress = isCitreaReturnFlow
    ? undefined
    : selectedStablecoin?.tokenAddress;
  const vaultAddress = isCitreaReturnFlow
    ? undefined
    : (selectedStablecoin?.depositVaultAddress as HexAddress | undefined);
  const stablecoinChainId = MAINNET_CHAIN_ID;
  const gusdChainId = isCitreaReturnFlow
    ? CITREA_CHAIN_ID_NUMBER
    : MAINNET_CHAIN_ID;
  const stablecoinBlockNumber =
    activeChainId === stablecoinChainId ? blockNumber : undefined;
  const gusdBlockNumber =
    activeChainId === gusdChainId ? blockNumber : undefined;

  const { decimals: stablecoinDecimals } = useErc20Decimals(
    stablecoinAddress,
    stablecoinChainId,
  );
  const { decimals: gusdDecimals } = useErc20Decimals(gusdAddress, gusdChainId);
  const { decimals: citreaGusdDecimals } = useErc20Decimals(
    CITREA_WHITELABEL_ADDRESS,
    CITREA_CHAIN_ID_NUMBER,
  );
  const { decimals: citreaVaultDecimals } = useErc20Decimals(
    CITREA_VAULT_ADDRESS,
    CITREA_CHAIN_ID_NUMBER,
  );

  const isCitreaDeposit = isDepositFlow && depositRoute === "citrea";
  const isPredepositDeposit = isDepositFlow && depositRoute === "predeposit";
  const isNonMainnetDeposit = isDepositFlow && depositRoute !== "mainnet";

  const depositorAddress = getGenericDepositorAddress(chainName);
  const genericUnitTokenAddress = getGenericUnitTokenAddress(chainName);
  const statusPredepositChainNickname =
    getPredepositChainNickname("predeposit");
  const predepositChainNickname = isPredepositDeposit
    ? statusPredepositChainNickname
    : undefined;
  const predepositSender = accountAddress ?? ZERO_ADDRESS;
  const predepositRecipient = accountAddress
    ? toBytes32(accountAddress)
    : toBytes32(ZERO_ADDRESS);
  const predepositEnabled = Boolean(
    accountAddress && depositRoute === "predeposit",
  );

  const {
    data: statusPredepositAmount,
    isLoading: isStatusPredepositLoading,
    isError: isStatusPredepositError,
    refetch: refetchStatusPredeposit,
  } = useReadContract({
    address: BRIDGE_COORDINATOR_L1_ADDRESS,
    abi: bridgeCoordinatorPredepositAbi,
    chainId: MAINNET_CHAIN_ID,
    functionName: "getPredeposit",
    args: [
      statusPredepositChainNickname,
      predepositSender,
      predepositRecipient,
    ] as const,
    query: {
      enabled: predepositEnabled,
    },
  });

  const stablecoinBalance = useBalance({
    address: accountAddress,
    token: stablecoinAddress,
    chainId: stablecoinChainId,
    blockNumber: stablecoinBlockNumber,
    query: {
      enabled: Boolean(accountAddress && stablecoinAddress),
    },
  });

  const gusdBalance = useBalance({
    address: accountAddress,
    token: gusdAddress,
    chainId: gusdChainId,
    blockNumber: gusdBlockNumber,
    query: {
      enabled: Boolean(accountAddress && gusdAddress),
    },
  });

  const gusdMainnetBalance = useBalance({
    address: accountAddress,
    token: l1GusdAddress,
    chainId: MAINNET_CHAIN_ID,
    query: {
      enabled: Boolean(accountAddress && l1GusdAddress && isCitreaReturnFlow),
    },
  });

  const citreaGusdBalance = useBalance({
    address: accountAddress,
    token: CITREA_WHITELABEL_ADDRESS,
    chainId: CITREA_CHAIN_ID_NUMBER,
    watch: Boolean(accountAddress),
    query: {
      enabled: Boolean(accountAddress),
    },
  });

  const citreaVaultBalance = useBalance({
    address: accountAddress,
    token: CITREA_VAULT_ADDRESS,
    chainId: CITREA_CHAIN_ID_NUMBER,
    watch: Boolean(accountAddress),
    query: {
      enabled: Boolean(accountAddress),
    },
  });

  const statusPredepositBalance = useMemo(() => {
    if (isStatusPredepositLoading) {
      return { isLoading: true, isError: false };
    }

    if (
      isStatusPredepositError ||
      statusPredepositAmount == null ||
      gusdDecimals == null
    ) {
      return { isLoading: false, isError: true };
    }

    return {
      isLoading: false,
      isError: false,
      data: {
        formatted: formatUnits(statusPredepositAmount, gusdDecimals),
      },
    };
  }, [
    gusdDecimals,
    isStatusPredepositError,
    isStatusPredepositLoading,
    statusPredepositAmount,
  ]);

  const fromAssetType: AssetType = isDepositFlow ? "stablecoin" : "gusd";

  const toAssetType: AssetType = isDepositFlow
    ? "gusd"
    : isCitreaReturnFlow
      ? "gusd"
      : "stablecoin";

  const fromBalanceHook =
    fromAssetType === "stablecoin"
      ? stablecoinBalance
      : depositRoute === "predeposit"
        ? statusPredepositBalance
        : gusdBalance;
  const toBalanceHook =
    toAssetType === "stablecoin"
      ? stablecoinBalance
      : depositRoute === "predeposit"
        ? statusPredepositBalance
        : isCitreaReturnFlow
          ? gusdMainnetBalance
          : gusdBalance;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset amount when the active asset changes
  useEffect(() => {
    setFromAmount("");
  }, [selectedTicker, isDepositFlow, depositRoute, chainName]);

  useEffect(() => {
    if (depositRoute !== "citrea") {
      setStakeAfterBridge(false);
      setStakeAmountTouched(false);
      setBridgeStakeState("idle");
      setPendingStakeAmount(null);
      setStakeError(null);
      setCitreaBalanceBaseline(null);
      setAutoSwitchRequested(false);
    }
  }, [depositRoute]);

  useEffect(() => {
    if (
      !stakeAfterBridge ||
      stakeAmountTouched ||
      (bridgeStakeState !== "idle" && bridgeStakeState !== "complete")
    ) {
      return;
    }

    setStakeAmount(fromAmount);
  }, [bridgeStakeState, fromAmount, stakeAfterBridge, stakeAmountTouched]);

  useEffect(() => {
    const storedRecords = loadLzBridgeRecords();
    setLzBridgeRecords(storedRecords);
    if (ENABLE_LZ_LOGS) {
      const pending = storedRecords.filter(
        (record) => !isFinalLzStatus(record.status),
      );
      console.info("LZ storage: pending txs loaded", {
        count: pending.length,
        txHashes: pending.map((record) => record.txHash),
      });
    }
  }, []);

  useEffect(() => {
    const pruned = pruneLzBridgeRecords(lzBridgeRecords);
    if (pruned !== lzBridgeRecords) {
      setLzBridgeRecords(pruned);
      return;
    }
    saveLzBridgeRecords(pruned);
  }, [lzBridgeRecords]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLzBridgeRecords((current) => pruneLzBridgeRecords(current));
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const fromBalanceText = formatBalanceText(
    fromBalanceHook,
    accountAddress,
    fromAssetType === "gusd" ? { fixedDecimals: 2 } : undefined,
  );
  const toBalanceText = formatBalanceText(
    toBalanceHook,
    accountAddress,
    toAssetType === "gusd" ? { fixedDecimals: 2 } : undefined,
  );
  const isStatusDeposit = isDepositFlow && depositRoute === "predeposit";
  const statusPredepositBalanceText = isStatusDeposit
    ? formatBalanceText(statusPredepositBalance, accountAddress, {
        fixedDecimals: 2,
      }).replace(/^Balance:/, "Predeposited:")
    : null;
  const finalToBalanceText = statusPredepositBalanceText ?? toBalanceText;
  const canUseMax =
    Boolean(accountAddress) && Boolean(fromBalanceHook.data?.formatted);

  const handleMaxClick = () => {
    const value = fromBalanceHook.data?.formatted;
    if (value) {
      setFromAmount(value);
    }
  };

  const canUseStakeMax =
    Boolean(accountAddress) && Boolean(citreaGusdBalance.data?.formatted);

  const handleStakeMaxClick = () => {
    const value = citreaGusdBalance.data?.formatted;
    if (value) {
      setStakeAmount(value);
      setStakeAmountTouched(true);
    }
  };

  const fromDecimals =
    fromAssetType === "stablecoin" ? stablecoinDecimals : gusdDecimals;
  const toDecimals =
    toAssetType === "stablecoin" ? stablecoinDecimals : gusdDecimals;

  const shouldUseVaultPreview = isDepositFlow
    ? !isNonMainnetDeposit && !shouldSwitchChain
    : !isCitreaReturnFlow && !isPredepositRedeem && !shouldSwitchChain;

  const { quote: previewToAmount, parsedAmount } = useErc4626Preview({
    amount: fromAmount,
    fromDecimals,
    toDecimals,
    vaultAddress: shouldUseVaultPreview ? vaultAddress : undefined,
    mode: isDepositFlow ? "deposit" : "redeem",
  });

  const estimatedToAmount = shouldUseVaultPreview
    ? previewToAmount
    : fromAmount;
  const fromPlaceholder =
    fromAssetType === "stablecoin"
      ? `Amount in ${selectedStablecoin?.ticker ?? ""}`
      : "Amount in GUSD";
  const toPlaceholder =
    toAssetType === "stablecoin"
      ? `Amount in ${selectedStablecoin?.ticker ?? ""}`
      : "Amount in GUSD";

  const depositTokenAddress = stablecoinAddress;

  const {
    allowance: depositAllowance,
    refetchAllowance: refetchDepositAllowance,
  } = useTokenAllowance({
    token: isDepositFlow ? depositTokenAddress : undefined,
    owner: accountAddress,
    spender: depositorAddress,
  });

  const {
    allowance: redeemAllowance,
    refetchAllowance: refetchRedeemAllowance,
  } = useTokenAllowance({
    token: !isDepositFlow ? genericUnitTokenAddress : undefined,
    owner: accountAddress,
    spender: !isDepositFlow ? vaultAddress : undefined,
  });

  const {
    allowance: citreaAllowance,
    refetchAllowance: refetchCitreaAllowance,
  } = useTokenAllowance({
    token: isCitreaReturnFlow ? CITREA_WHITELABEL_ADDRESS : undefined,
    owner: accountAddress,
    spender: isCitreaReturnFlow ? BRIDGE_COORDINATOR_L2_ADDRESS : undefined,
  });

  const { allowance: stakeAllowance, refetchAllowance: refetchStakeAllowance } =
    useTokenAllowance({
      token: CITREA_WHITELABEL_ADDRESS,
      owner: accountAddress,
      spender: CITREA_VAULT_ADDRESS,
      chainIdOverride: CITREA_CHAIN_ID_NUMBER,
    });

  const needsDepositApproval = useMemo(() => {
    if (!parsedAmount || !isDepositFlow) {
      return false;
    }

    return depositAllowance < parsedAmount;
  }, [depositAllowance, isDepositFlow, parsedAmount]);

  const needsRedeemApproval = useMemo(() => {
    if (!parsedAmount || isDepositFlow) {
      return false;
    }

    return redeemAllowance < parsedAmount;
  }, [isDepositFlow, parsedAmount, redeemAllowance]);

  const needsCitreaApproval = useMemo(() => {
    if (!parsedAmount || !isCitreaReturnFlow) {
      return false;
    }

    return citreaAllowance < parsedAmount;
  }, [citreaAllowance, isCitreaReturnFlow, parsedAmount]);

  const needsApproval = isDepositFlow
    ? needsDepositApproval
    : isCitreaReturnFlow
      ? needsCitreaApproval
      : needsRedeemApproval;
  const fromBalanceValue = fromBalanceHook.data?.value;
  const insufficientBalance = Boolean(
    parsedAmount &&
      fromBalanceValue !== undefined &&
      parsedAmount > fromBalanceValue,
  );
  const stakeParsedAmount = useMemo(() => {
    if (!citreaGusdDecimals || stakeAmount.trim() === "") {
      return null;
    }

    try {
      return parseUnits(stakeAmount, citreaGusdDecimals);
    } catch {
      return null;
    }
  }, [citreaGusdDecimals, stakeAmount]);
  const stakeTargetAmount = pendingStakeAmount ?? stakeParsedAmount;
  const stakeBalanceValue = citreaGusdBalance.data?.value;
  const stakeInsufficientBalance = Boolean(
    stakeTargetAmount &&
      stakeBalanceValue !== undefined &&
      stakeTargetAmount > stakeBalanceValue,
  );
  const needsStakeApproval = Boolean(
    stakeTargetAmount && stakeAllowance < stakeTargetAmount,
  );
  const stakePreviewAmount = stakeTargetAmount ?? BigInt(0);
  const stakePreviewEnabled = Boolean(
    stakeTargetAmount && stakeTargetAmount > ZERO_AMOUNT,
  );
  const { data: stakePreviewShares } = useReadContract({
    address: CITREA_VAULT_ADDRESS,
    abi: erc4626Abi,
    chainId: CITREA_CHAIN_ID_NUMBER,
    functionName: "previewDeposit",
    args: [stakePreviewAmount],
    query: {
      enabled: stakePreviewEnabled,
    },
  });
  const stakePreviewText =
    stakePreviewShares != null && citreaVaultDecimals != null
      ? formatTokenAmount(
          formatUnits(stakePreviewShares, citreaVaultDecimals),
          6,
        )
      : "—";
  const stakeBalanceText = formatTokenBalanceText(
    citreaGusdBalance,
    accountAddress,
    "GUSD",
  );
  const stakePositionText = formatTokenBalanceText(
    citreaVaultBalance,
    accountAddress,
    "shares",
  ).replace(/^Balance:/, "Staked:");
  const hasCitreaStakePosition =
    (citreaVaultBalance.data?.value ?? ZERO_AMOUNT) > ZERO_AMOUNT;
  const hasCitreaGusdBalance =
    (citreaGusdBalance.data?.value ?? ZERO_AMOUNT) > ZERO_AMOUNT;
  const showStakePanel =
    depositRoute === "citrea" &&
    (stakeAfterBridge ||
      hasCitreaStakePosition ||
      hasCitreaGusdBalance ||
      bridgeStakeState !== "idle");
  const showStakeActionButton = Boolean(accountAddress && hasCitreaGusdBalance);
  const pendingLzRecords = useMemo(() => {
    if (!accountAddress) {
      return [];
    }

    return lzBridgeRecords.filter(
      (record) =>
        record.account.toLowerCase() === accountAddress.toLowerCase() &&
        !isFinalLzStatus(record.status),
    );
  }, [accountAddress, lzBridgeRecords]);
  const pendingL1ToCitrea = pendingLzRecords.find(
    (record) => record.direction === "l1-to-citrea",
  );
  const pendingCitreaToL1 = pendingLzRecords.find(
    (record) => record.direction === "citrea-to-l1",
  );
  const pendingBridgeForRoute = isCitreaReturnFlow
    ? pendingCitreaToL1
    : isCitreaDeposit
      ? pendingL1ToCitrea
      : null;
  const pendingBridgeStatusLabel = pendingBridgeForRoute?.status
    ? pendingBridgeForRoute.status.replace(/_/g, " ").toLowerCase()
    : "pending";

  useEffect(() => {
    let visibleTimeout: number | undefined;
    let shiftTimeout: number | undefined;

    if (showStakePanel) {
      setStakePanelShifted(true);
      visibleTimeout = window.setTimeout(() => {
        setStakePanelVisible(true);
      }, 560);
    } else {
      setStakePanelVisible(false);
      shiftTimeout = window.setTimeout(() => {
        setStakePanelShifted(false);
      }, 320);
    }

    return () => {
      if (visibleTimeout) {
        window.clearTimeout(visibleTimeout);
      }
      if (shiftTimeout) {
        window.clearTimeout(shiftTimeout);
      }
    };
  }, [showStakePanel]);

  useEffect(() => {
    if (bridgeStakeState !== "waiting" || !citreaGusdBalance.refetch) {
      return;
    }

    const interval = window.setInterval(() => {
      void citreaGusdBalance.refetch();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [bridgeStakeState, citreaGusdBalance]);

  useEffect(() => {
    if (!pendingLzRecords.length) {
      return;
    }

    let cancelled = false;

    const pollStatuses = async () => {
      const updates = await Promise.all(
        pendingLzRecords.map(async (record) => {
          try {
            const status = await fetchLzMessageStatus(record.txHash, {
              srcEid: record.srcEid,
              dstEid: record.dstEid,
            });
            if (ENABLE_LZ_LOGS) {
              console.info("LZ poll: status fetched", {
                txHash: record.txHash,
                status: status.statusName,
                guid: status.guid,
              });
            }
            return {
              ...record,
              status: status.statusName ?? record.status,
              statusMessage: status.statusMessage ?? record.statusMessage,
              guid: status.guid ?? record.guid,
              updatedAt: Date.now(),
            };
          } catch {
            if (ENABLE_LZ_LOGS) {
              console.warn("LZ poll: status fetch failed", {
                txHash: record.txHash,
              });
            }
            return record;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setLzBridgeRecords((current) => {
        const updateMap = new Map(
          updates.map((item) => [item.txHash.toLowerCase(), item]),
        );

        if (ENABLE_LZ_LOGS) {
          current.forEach((record) => {
            const updated = updateMap.get(record.txHash.toLowerCase());
            if (updated?.status && updated.status !== record.status) {
              console.info("LZ poll: status updated", {
                txHash: record.txHash,
                from: record.status ?? "unknown",
                to: updated.status,
              });
            }
          });
        }

        return current.map(
          (record) => updateMap.get(record.txHash.toLowerCase()) ?? record,
        );
      });
    };

    pollStatuses();
    const interval = window.setInterval(pollStatuses, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingLzRecords]);

  useEffect(() => {
    if (
      bridgeStakeState !== "waiting" ||
      !pendingStakeAmount ||
      stakeBalanceValue === undefined
    ) {
      return;
    }

    const baseline = citreaBalanceBaseline ?? ZERO_AMOUNT;
    if (stakeBalanceValue >= baseline + pendingStakeAmount) {
      setBridgeStakeState("ready");
    }
  }, [
    bridgeStakeState,
    citreaBalanceBaseline,
    pendingStakeAmount,
    stakeBalanceValue,
  ]);

  useEffect(() => {
    if (
      bridgeStakeState !== "ready" ||
      !stakeAfterBridge ||
      activeChainId === CITREA_CHAIN_ID_NUMBER ||
      !switchChainAsync ||
      autoSwitchRequested
    ) {
      return;
    }

    setAutoSwitchRequested(true);
    switchChainAsync({ chainId: CITREA_CHAIN_ID_NUMBER }).catch(() =>
      setAutoSwitchRequested(false),
    );
  }, [
    activeChainId,
    autoSwitchRequested,
    bridgeStakeState,
    stakeAfterBridge,
    switchChainAsync,
  ]);

  const isBridgeAndStakeFlow = isCitreaDeposit && stakeAfterBridge;
  const depositActionLabel =
    depositRoute === "predeposit"
      ? "Predeposit"
      : isBridgeAndStakeFlow
        ? "Bridge & Stake"
        : "Mint";

  const depositButtonLabel =
    depositRoute === "predeposit"
      ? "Predeposit"
      : isBridgeAndStakeFlow
        ? "Bridge & Stake"
        : "Mint";
  const redeemActionLabel = isCitreaReturnFlow ? "Bridge" : "Redeem";

  const buttonState = useMemo(() => {
    const actionLabel = isDepositFlow ? depositButtonLabel : redeemActionLabel;

    if (!accountAddress) {
      return { label: "Connect wallet", disabled: true };
    }

    if (isPredepositRedeem) {
      return { label: "Locked", disabled: true };
    }

    if (shouldSwitchChain) {
      return {
        label: `Switch to ${requiredChainLabel}`,
        disabled: !switchChainAsync,
      };
    }

    if (isDepositFlow) {
      if (!depositorAddress) {
        return { label: "Depositor unavailable", disabled: true };
      }

      if (isNonMainnetDeposit) {
        if (!stablecoinAddress) {
          return { label: "Select asset", disabled: true };
        }
      } else {
        if (!stablecoinAddress) {
          return { label: "Select asset", disabled: true };
        }

        if (!gusdAddress) {
          return { label: "GUSD unavailable", disabled: true };
        }
      }
    } else {
      if (!gusdAddress) {
        return { label: "GUSD unavailable", disabled: true };
      }

      if (!isCitreaReturnFlow) {
        if (!genericUnitTokenAddress) {
          return { label: "Generic unit unavailable", disabled: true };
        }

        if (!vaultAddress) {
          return { label: "Vault unavailable", disabled: true };
        }
      }
    }

    if (!parsedAmount || parsedAmount <= ZERO_AMOUNT) {
      return { label: "Enter amount", disabled: true };
    }

    if (insufficientBalance) {
      return { label: "Insufficient balance", disabled: true };
    }

    if (txStep === "approving") {
      return { label: "Approving…", disabled: true };
    }

    if (txStep === "submitting") {
      return { label: `${actionLabel}…`, disabled: true };
    }

    if (needsApproval) {
      return { label: `Approve & ${actionLabel}`, disabled: false };
    }

    return { label: actionLabel, disabled: false };
  }, [
    accountAddress,
    depositButtonLabel,
    depositorAddress,
    gusdAddress,
    genericUnitTokenAddress,
    isCitreaReturnFlow,
    isDepositFlow,
    isNonMainnetDeposit,
    isPredepositRedeem,
    needsApproval,
    parsedAmount,
    redeemActionLabel,
    requiredChainLabel,
    shouldSwitchChain,
    stablecoinAddress,
    switchChainAsync,
    txStep,
    vaultAddress,
    insufficientBalance,
  ]);

  const stakeToggleDisabled =
    bridgeStakeState === "bridging" ||
    bridgeStakeState === "waiting" ||
    bridgeStakeState === "ready" ||
    bridgeStakeState === "staking";

  const stakeButtonState = useMemo(() => {
    if (!accountAddress) {
      return { label: "Connect wallet", disabled: true };
    }

    if (bridgeStakeState === "bridging" || bridgeStakeState === "waiting") {
      return { label: "Waiting for bridge…", disabled: true };
    }

    if (bridgeStakeState === "staking") {
      return { label: "Staking…", disabled: true };
    }

    if (bridgeStakeState === "complete") {
      return { label: "Staked", disabled: true };
    }

    if (!stakeTargetAmount || stakeTargetAmount <= ZERO_AMOUNT) {
      return { label: "Enter amount", disabled: true };
    }

    if (stakeInsufficientBalance) {
      return { label: "Insufficient balance", disabled: true };
    }

    if (activeChainId !== CITREA_CHAIN_ID_NUMBER) {
      return { label: "Switch to Citrea", disabled: !switchChainAsync };
    }

    if (needsStakeApproval) {
      return { label: "Approve & Stake", disabled: false };
    }

    if (bridgeStakeState === "error") {
      return { label: "Retry stake", disabled: false };
    }

    return { label: "Stake", disabled: false };
  }, [
    accountAddress,
    activeChainId,
    bridgeStakeState,
    needsStakeApproval,
    stakeInsufficientBalance,
    stakeTargetAmount,
    switchChainAsync,
  ]);

  const stakeInputDisabled =
    bridgeStakeState === "bridging" ||
    bridgeStakeState === "waiting" ||
    bridgeStakeState === "ready" ||
    bridgeStakeState === "staking";

  const handleDeposit = async () => {
    if (
      !accountAddress ||
      !parsedAmount ||
      parsedAmount <= ZERO_AMOUNT ||
      !depositorAddress ||
      !publicClient
    ) {
      return;
    }

    setTxError(null);
    setPostMintHref(null);

    const routeAtSubmit = depositRoute;

    try {
      if (depositAllowance < parsedAmount) {
        const approvalToken = stablecoinAddress;
        if (!approvalToken) {
          return;
        }

        setTxStep("approving");
        console.info("Deposit approval call", {
          functionName: "approve",
          address: approvalToken,
          chainId: activeChainId,
          args: [depositorAddress, parsedAmount],
          route: depositRoute,
        });
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: approvalToken,
          chainId: activeChainId,
          functionName: "approve",
          args: [depositorAddress, parsedAmount],
        });
        notifyTxSubmitted("Approval", approvalHash);
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        notifyTxConfirmed("Approval", approvalHash);
        await refetchDepositAllowance?.();
      }

      setTxStep("submitting");
      let depositHash: HexBytes;
      if (isCitreaDeposit) {
        if (
          !stablecoinAddress ||
          !l1GusdAddress ||
          !mainnetClient ||
          !BRIDGE_COORDINATOR_L1_ADDRESS
        ) {
          return;
        }
        if (stakeAfterBridge) {
          const targetAmount =
            stakeParsedAmount && stakeParsedAmount > ZERO_AMOUNT
              ? stakeParsedAmount
              : parsedAmount;
          setPendingStakeAmount(targetAmount);
          setBridgeStakeState("bridging");
          setStakeError(null);
          setCitreaBalanceBaseline(stakeBalanceValue ?? ZERO_AMOUNT);
        }
        const remoteRecipient = toBytes32(accountAddress);
        const sender = toBytes32(accountAddress);
        const sourceWhitelabel = toBytes32(l1GusdAddress as HexBytes);
        const destinationWhitelabel = CITREA_WHITELABEL;
        const nativeFee = await estimateLzBridgeFee({
          client: mainnetClient,
          bridgeCoordinatorAddress: BRIDGE_COORDINATOR_L1_ADDRESS,
          adapterAddress: LZ_ADAPTER_L1_ADDRESS,
          destinationChainId: CITREA_CHAIN_ID,
          bridgeParams: CITREA_BRIDGE_PARAMS,
          message: {
            sender,
            recipient: remoteRecipient,
            sourceWhitelabel,
            destinationWhitelabel,
            amount: parsedAmount,
          },
        });

        if (nativeFee == null) {
          return;
        }

        console.info("Deposit & bridge call", {
          functionName: "depositAndBridge",
          address: depositorAddress,
          chainId: activeChainId,
          assets: parsedAmount,
          args: [
            stablecoinAddress,
            parsedAmount,
            CITREA_BRIDGE_TYPE,
            CITREA_CHAIN_ID,
            remoteRecipient,
            CITREA_WHITELABEL,
            CITREA_BRIDGE_PARAMS,
          ],
          value: nativeFee,
        });
        depositHash = await writeContractAsync({
          abi: depositorAbi,
          address: depositorAddress,
          chainId: activeChainId,
          functionName: "depositAndBridge",
          args: [
            stablecoinAddress,
            parsedAmount,
            CITREA_BRIDGE_TYPE,
            CITREA_CHAIN_ID,
            remoteRecipient,
            CITREA_WHITELABEL,
            CITREA_BRIDGE_PARAMS,
          ],
          value: nativeFee,
        });
        if (ENABLE_LZ_LOGS) {
          console.info("LZ track: L1→Citrea tx stored", {
            txHash: depositHash,
            account: accountAddress,
            amount: parsedAmount.toString(),
          });
        }
        setLzBridgeRecords((current) =>
          upsertLzBridgeRecord(current, {
            txHash: depositHash,
            account: accountAddress as HexAddress,
            direction: "l1-to-citrea",
            srcEid: LZ_EID_ETHEREUM,
            dstEid: LZ_EID_CITREA,
            createdAt: Date.now(),
            status: "SUBMITTED",
          }),
        );
        console.info("Deposit & bridge tx sent", {
          hash: depositHash,
          route: "citrea",
          bridgeParams: CITREA_BRIDGE_PARAMS,
        });
      } else if (isPredepositDeposit) {
        if (!stablecoinAddress || !predepositChainNickname) {
          return;
        }
        const remoteRecipient = toBytes32(accountAddress);
        console.info("Predeposit call", {
          functionName: "depositAndPredeposit",
          address: depositorAddress,
          chainId: activeChainId,
          assets: parsedAmount,
          args: [
            stablecoinAddress,
            parsedAmount,
            predepositChainNickname,
            remoteRecipient,
          ],
        });
        depositHash = await writeContractAsync({
          abi: depositorAbi,
          address: depositorAddress,
          chainId: activeChainId,
          functionName: "depositAndPredeposit",
          args: [
            stablecoinAddress,
            parsedAmount,
            predepositChainNickname,
            remoteRecipient,
          ],
        });
      } else {
        if (!stablecoinAddress || !gusdAddress) {
          return;
        }
        console.info("Deposit call", {
          functionName: "deposit",
          address: depositorAddress,
          chainId: activeChainId,
          args: [stablecoinAddress, gusdAddress, parsedAmount],
        });
        depositHash = await writeContractAsync({
          abi: depositorAbi,
          address: depositorAddress,
          chainId: activeChainId,
          functionName: "deposit",
          args: [stablecoinAddress, gusdAddress, parsedAmount],
        });
      }
      notifyTxSubmitted(depositActionLabel, depositHash);
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      notifyTxConfirmed(depositActionLabel, depositHash);
      if (isCitreaDeposit && stakeAfterBridge) {
        // TODO: replace balance polling with LayerZero message status tracking.
        setBridgeStakeState("waiting");
      }

      const opportunityHref = getOpportunityHref(routeAtSubmit);
      if (opportunityHref) {
        setPostMintHref(opportunityHref);
      }

      setFromAmount("");
      const balanceRefetches: Promise<unknown>[] = [];
      if (stablecoinBalance.refetch) {
        balanceRefetches.push(stablecoinBalance.refetch());
      }
      if (gusdBalance.refetch) {
        balanceRefetches.push(gusdBalance.refetch());
      }
      if (isPredepositDeposit && refetchStatusPredeposit) {
        balanceRefetches.push(refetchStatusPredeposit());
      }
      if (balanceRefetches.length) {
        await Promise.allSettled(balanceRefetches);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed";
      setTxError(message);
      if (isCitreaDeposit && stakeAfterBridge) {
        setBridgeStakeState("error");
        setStakeError(message);
      }
      pushAlert({
        type: "error",
        title: "Transaction failed",
        message,
      });
    } finally {
      setTxStep("idle");
    }
  };

  const handleCitreaReturn = async () => {
    if (
      !accountAddress ||
      !parsedAmount ||
      parsedAmount <= ZERO_AMOUNT ||
      !publicClient ||
      !l1GusdAddress
    ) {
      return;
    }

    setTxError(null);
    setPostMintHref(null);

    try {
      if (citreaAllowance < parsedAmount) {
        setTxStep("approving");
        console.info("Citrea approval call", {
          functionName: "approve",
          address: CITREA_WHITELABEL_ADDRESS,
          chainId: activeChainId,
          args: [BRIDGE_COORDINATOR_L2_ADDRESS, parsedAmount],
        });
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: CITREA_WHITELABEL_ADDRESS,
          chainId: activeChainId,
          functionName: "approve",
          args: [BRIDGE_COORDINATOR_L2_ADDRESS, parsedAmount],
        });
        notifyTxSubmitted("Approval", approvalHash);
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        notifyTxConfirmed("Approval", approvalHash);
        await refetchCitreaAllowance?.();
      }

      setTxStep("submitting");
      const sender = toBytes32(accountAddress);
      const remoteRecipient = toBytes32(accountAddress);
      const destinationWhitelabel = toBytes32(l1GusdAddress as HexBytes);
      const nativeFee = await estimateLzBridgeFee({
        client: publicClient,
        bridgeCoordinatorAddress: BRIDGE_COORDINATOR_L2_ADDRESS,
        adapterAddress: LZ_ADAPTER_L2_ADDRESS,
        destinationChainId: L1_CHAIN_ID,
        bridgeParams: CITREA_BRIDGE_PARAMS,
        message: {
          sender,
          recipient: remoteRecipient,
          sourceWhitelabel: CITREA_WHITELABEL,
          destinationWhitelabel,
          amount: parsedAmount,
        },
      });

      if (nativeFee == null) {
        return;
      }

      console.info("Bridge back call", {
        functionName: "bridge",
        address: BRIDGE_COORDINATOR_L2_ADDRESS,
        chainId: activeChainId,
        args: [
          CITREA_BRIDGE_TYPE,
          L1_CHAIN_ID,
          accountAddress,
          remoteRecipient,
          CITREA_WHITELABEL_ADDRESS,
          destinationWhitelabel,
          parsedAmount,
          CITREA_BRIDGE_PARAMS,
        ],
        value: nativeFee,
      });

      const bridgeHash = await writeContractAsync({
        abi: bridgeCoordinatorL2Abi,
        address: BRIDGE_COORDINATOR_L2_ADDRESS,
        chainId: CITREA_CHAIN_ID_NUMBER,
        functionName: "bridge",
        args: [
          CITREA_BRIDGE_TYPE,
          L1_CHAIN_ID,
          accountAddress,
          remoteRecipient,
          CITREA_WHITELABEL_ADDRESS,
          destinationWhitelabel,
          parsedAmount,
          CITREA_BRIDGE_PARAMS,
        ],
        value: nativeFee,
      });
      if (ENABLE_LZ_LOGS) {
        console.info("LZ track: Citrea→L1 tx stored", {
          txHash: bridgeHash,
          account: accountAddress,
          amount: parsedAmount.toString(),
        });
      }
      setLzBridgeRecords((current) =>
        upsertLzBridgeRecord(current, {
          txHash: bridgeHash,
          account: accountAddress as HexAddress,
          direction: "citrea-to-l1",
          srcEid: LZ_EID_CITREA,
          dstEid: LZ_EID_ETHEREUM,
          createdAt: Date.now(),
          status: "SUBMITTED",
        }),
      );
      notifyTxSubmitted("Bridge", bridgeHash);
      await publicClient.waitForTransactionReceipt({ hash: bridgeHash });
      notifyTxConfirmed("Bridge", bridgeHash);

      setFromAmount("");
      const balanceRefetches: Promise<unknown>[] = [];
      if (gusdBalance.refetch) {
        balanceRefetches.push(gusdBalance.refetch());
      }
      if (gusdMainnetBalance.refetch) {
        balanceRefetches.push(gusdMainnetBalance.refetch());
      }
      if (balanceRefetches.length) {
        await Promise.allSettled(balanceRefetches);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed";
      setTxError(message);
      pushAlert({
        type: "error",
        title: "Transaction failed",
        message,
      });
    } finally {
      setTxStep("idle");
    }
  };

  const handleStake = useCallback(
    async (amountOverride?: bigint) => {
      if (
        !accountAddress ||
        activeChainId !== CITREA_CHAIN_ID_NUMBER ||
        !publicClient
      ) {
        return;
      }

      const targetAmount = amountOverride ?? stakeParsedAmount;
      if (!targetAmount || targetAmount <= ZERO_AMOUNT) {
        return;
      }

      setStakeError(null);
      setBridgeStakeState("staking");

      try {
        if (stakeAllowance < targetAmount) {
          console.info("Stake approval call", {
            functionName: "approve",
            address: CITREA_WHITELABEL_ADDRESS,
            chainId: activeChainId,
            args: [CITREA_VAULT_ADDRESS, targetAmount],
          });
          const approvalHash = await writeContractAsync({
            abi: erc20Abi,
            address: CITREA_WHITELABEL_ADDRESS,
            chainId: activeChainId,
            functionName: "approve",
            args: [CITREA_VAULT_ADDRESS, targetAmount],
          });
          notifyTxSubmitted("Stake approval", approvalHash);
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          notifyTxConfirmed("Stake approval", approvalHash);
          await refetchStakeAllowance?.();
        }

        console.info("Stake deposit call", {
          functionName: "deposit",
          address: CITREA_VAULT_ADDRESS,
          chainId: activeChainId,
          args: [targetAmount, accountAddress],
        });
        const stakeHash = await writeContractAsync({
          abi: erc4626Abi,
          address: CITREA_VAULT_ADDRESS,
          chainId: activeChainId,
          functionName: "deposit",
          args: [targetAmount, accountAddress],
        });
        notifyTxSubmitted("Stake", stakeHash);
        await publicClient.waitForTransactionReceipt({ hash: stakeHash });
        notifyTxConfirmed("Stake", stakeHash);

        setBridgeStakeState("complete");
        setPendingStakeAmount(null);
        setAutoSwitchRequested(false);
        const refetches: Promise<unknown>[] = [];
        if (citreaGusdBalance.refetch) {
          refetches.push(citreaGusdBalance.refetch());
        }
        if (citreaVaultBalance.refetch) {
          refetches.push(citreaVaultBalance.refetch());
        }
        if (refetches.length) {
          await Promise.allSettled(refetches);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Staking failed";
        setStakeError(message);
        setBridgeStakeState("error");
        pushAlert({
          type: "error",
          title: "Staking failed",
          message,
        });
      }
    },
    [
      accountAddress,
      activeChainId,
      citreaGusdBalance.refetch,
      citreaVaultBalance.refetch,
      publicClient,
      refetchStakeAllowance,
      stakeAllowance,
      stakeParsedAmount,
      writeContractAsync,
    ],
  );

  useEffect(() => {
    if (
      bridgeStakeState !== "ready" ||
      !stakeAfterBridge ||
      activeChainId !== CITREA_CHAIN_ID_NUMBER ||
      !pendingStakeAmount
    ) {
      return;
    }

    void handleStake(pendingStakeAmount);
  }, [
    activeChainId,
    bridgeStakeState,
    handleStake,
    pendingStakeAmount,
    stakeAfterBridge,
  ]);

  const handleRedeem = async () => {
    if (isCitreaReturnFlow) {
      await handleCitreaReturn();
      return;
    }

    if (
      !accountAddress ||
      !vaultAddress ||
      !gusdAddress ||
      !genericUnitTokenAddress ||
      !parsedAmount ||
      parsedAmount <= ZERO_AMOUNT ||
      !publicClient
    ) {
      return;
    }

    setTxError(null);
    setPostMintHref(null);

    try {
      const balanceBefore = await publicClient.readContract({
        abi: erc20Abi,
        address: genericUnitTokenAddress,
        functionName: "balanceOf",
        args: [accountAddress],
      });

      setTxStep("submitting");
      console.info("Unwrap call", {
        functionName: "unwrap",
        address: gusdAddress,
        chainId: activeChainId,
        args: [accountAddress, accountAddress, parsedAmount],
      });
      const unwrapHash = await writeContractAsync({
        abi: whitelabeledUnitAbi,
        address: gusdAddress,
        chainId: activeChainId,
        functionName: "unwrap",
        args: [accountAddress, accountAddress, parsedAmount],
      });
      notifyTxSubmitted("Unwrap", unwrapHash);
      await publicClient.waitForTransactionReceipt({ hash: unwrapHash });
      notifyTxConfirmed("Unwrap", unwrapHash);

      const balanceAfter = await publicClient.readContract({
        abi: erc20Abi,
        address: genericUnitTokenAddress,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      const redeemShares = balanceAfter - balanceBefore;
      console.info("Generic unit balance", {
        before: balanceBefore,
        after: balanceAfter,
        delta: redeemShares,
      });

      if (redeemShares <= ZERO_AMOUNT) {
        setTxError("No generic unit tokens available to redeem");
        pushAlert({
          type: "warning",
          title: "Redeem unavailable",
          message: "No generic unit tokens available to redeem.",
        });
        return;
      }

      const currentAllowance = await publicClient.readContract({
        abi: erc20Abi,
        address: genericUnitTokenAddress,
        functionName: "allowance",
        args: [accountAddress, vaultAddress],
      });

      if (currentAllowance < redeemShares) {
        setTxStep("approving");
        console.info("Redeem approval call", {
          functionName: "approve",
          address: genericUnitTokenAddress,
          chainId: activeChainId,
          args: [vaultAddress, redeemShares],
        });
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: genericUnitTokenAddress,
          chainId: activeChainId,
          functionName: "approve",
          args: [vaultAddress, redeemShares],
        });
        notifyTxSubmitted("Approval", approvalHash);
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        notifyTxConfirmed("Approval", approvalHash);
        await refetchRedeemAllowance?.();
      }

      setTxStep("submitting");
      console.info("Redeem call", {
        functionName: "redeem",
        address: vaultAddress,
        chainId: activeChainId,
        args: [redeemShares, accountAddress, accountAddress],
      });
      const redeemHash = await writeContractAsync({
        abi: erc4626Abi,
        address: vaultAddress,
        chainId: activeChainId,
        functionName: "redeem",
        args: [redeemShares, accountAddress, accountAddress],
      });
      notifyTxSubmitted("Redeem", redeemHash);
      await publicClient.waitForTransactionReceipt({ hash: redeemHash });
      notifyTxConfirmed("Redeem", redeemHash);

      setFromAmount("");
      const balanceRefetches: Promise<unknown>[] = [];
      if (stablecoinBalance.refetch) {
        balanceRefetches.push(stablecoinBalance.refetch());
      }
      if (gusdBalance.refetch) {
        balanceRefetches.push(gusdBalance.refetch());
      }
      if (balanceRefetches.length) {
        await Promise.allSettled(balanceRefetches);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed";
      setTxError(message);
      pushAlert({
        type: "error",
        title: "Transaction failed",
        message,
      });
    } finally {
      setTxStep("idle");
    }
  };

  const handlePrimaryAction = async () => {
    if (!accountAddress) {
      return;
    }

    if (isPredepositRedeem) {
      return;
    }

    if (shouldSwitchChain) {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: requiredChainId });
      }
      return;
    }

    if (insufficientBalance) {
      return;
    }

    if (isDepositFlow) {
      await handleDeposit();
      return;
    }

    if (isCitreaReturnFlow) {
      await handleCitreaReturn();
      return;
    }

    await handleRedeem();
  };

  const handleStakeAction = async () => {
    if (!accountAddress) {
      return;
    }

    if (bridgeStakeState === "bridging" || bridgeStakeState === "waiting") {
      return;
    }

    if (activeChainId !== CITREA_CHAIN_ID_NUMBER) {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: CITREA_CHAIN_ID_NUMBER });
      }
      return;
    }

    if (
      !stakeTargetAmount ||
      stakeTargetAmount <= ZERO_AMOUNT ||
      stakeInsufficientBalance
    ) {
      return;
    }

    await handleStake(stakeTargetAmount);
  };

  const depositFromChainLabel = "Ethereum";
  const depositToChainLabel =
    depositRoute === "citrea"
      ? "Citrea"
      : depositRoute === "predeposit"
        ? "Status L2"
        : depositFromChainLabel;

  const fromChainLabel = isDepositFlow
    ? depositFromChainLabel
    : isCitreaReturnFlow
      ? "Citrea"
      : "Ethereum";
  const toChainLabel = isDepositFlow ? depositToChainLabel : "Ethereum";

  const renderAssetSelector = (assetType: AssetType) => {
    if (assetType === "stablecoin") {
      return (
        <Select value={selectedTicker} onValueChange={handleStablecoinChange}>
          <SelectTrigger className="h-11 w-fit justify-start gap-2 px-3">
            {selectedStablecoin ? (
              <TokenIcon
                src={selectedStablecoin.iconUrl}
                alt={`${selectedStablecoin.ticker} icon`}
              />
            ) : null}
            <SelectValue
              placeholder="Select stablecoin"
              aria-label={selectedStablecoin?.ticker}
            />
          </SelectTrigger>
          <SelectContent>
            {stablecoins.map((coin) => (
              <SelectItem
                key={coin.ticker}
                value={coin.ticker}
                startContent={
                  <TokenIcon src={coin.iconUrl} alt={`${coin.ticker} icon`} />
                }
              >
                {coin.ticker}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <div className="flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 text-sm font-medium text-foreground">
        <TokenIcon src={gusd.iconUrl} alt="GUSD icon" />
        <span>GUSD</span>
      </div>
    );
  };

  return (
    <div id="deposit" className="w-full px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <div className="hidden -mt-20 space-y-4 text-center md:block">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Generic Money
          </span>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            One GUSD, many routes
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            Choose the opportunity that matches your DeFi strategy
          </p>
        </div>
        <fieldset className="mt-2 space-y-4 md:mt-20">
          <legend className="sr-only">Opportunity selection</legend>
          <div className="grid justify-items-center gap-3 md:grid-cols-2">
            {OPPORTUNITY_OPTIONS.filter(
              (option) => option.value !== "mainnet",
            ).map((option) => (
              <OpportunityCard
                key={option.value}
                option={option}
                selected={depositRoute === option.value}
                name="deposit-route"
                onSelect={() => {
                  setPostMintHref(null);
                  setDepositRoute(option.value);

                  if (
                    typeof window !== "undefined" &&
                    window.matchMedia("(max-width: 767px)").matches
                  ) {
                    document
                      .getElementById("deposit-form")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              />
            ))}
          </div>
        </fieldset>
        <div className="flex w-full justify-center" id="deposit-form">
          <div
            className={cn(
              "flex w-full flex-col items-center gap-6 max-w-md md:max-w-6xl md:flex-row md:items-start md:justify-center",
            )}
          >
            <div
              className={cn(
                "flex w-full max-w-md shrink-0 flex-col gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-[0_35px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur transition-transform duration-700 md:w-[32rem] md:max-w-none",
                stakePanelShifted
                  ? "md:translate-x-0"
                  : "md:translate-x-[12.75rem]",
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  <span>
                    {isDepositFlow
                      ? depositRoute === "predeposit"
                        ? "Predeposit"
                        : "Mint"
                      : "Redeem"}
                  </span>
                  <span>{selectedOpportunity.eyebrow}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formDescription}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <SwapAssetPanel
                  label="From"
                  chainLabel={fromChainLabel}
                  selector={renderAssetSelector(fromAssetType)}
                  inputProps={{
                    placeholder: fromPlaceholder,
                    autoComplete: "off",
                    value: fromAmount,
                    onChange: (event) => {
                      setPostMintHref(null);
                      setFromAmount(event.target.value);
                    },
                  }}
                  balance={{
                    text: fromBalanceText,
                    interactive: canUseMax,
                    onClick: canUseMax ? handleMaxClick : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={handleSwitchDirection}
                  disabled={!canSwitchDirection}
                  aria-label="Switch direction"
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
                <SwapAssetPanel
                  label="To"
                  chainLabel={toChainLabel}
                  selector={renderAssetSelector(toAssetType)}
                  inputProps={{
                    placeholder: toPlaceholder,
                    disabled: true,
                    readOnly: true,
                    value: estimatedToAmount,
                  }}
                  balance={{
                    text: finalToBalanceText,
                  }}
                />
              </div>
              {isDepositFlow && depositRoute === "citrea" ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Stake after bridge
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Automatically stake Citrea GUSD when funds arrive.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={stakeAfterBridge}
                      disabled={stakeToggleDisabled}
                      onClick={() => setStakeAfterBridge((current) => !current)}
                      className={cn(
                        "flex h-7 w-12 items-center rounded-full border border-border/70 p-1 transition",
                        stakeAfterBridge ? "bg-primary/90" : "bg-muted/60",
                        stakeToggleDisabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                          stakeAfterBridge ? "translate-x-5" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                  {hasCitreaStakePosition ? (
                    <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                      Position detected — staking panel unlocked.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {postMintHref &&
              isDepositFlow &&
              !txError &&
              txStep === "idle" ? (
                <a
                  href={postMintHref}
                  className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/95 text-sm font-semibold text-primary-foreground transition hover:from-primary/90 hover:via-primary/80 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  View opportunity
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={buttonState.disabled}
                  className="h-11 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/95 text-sm font-semibold text-primary-foreground transition hover:from-primary/90 hover:via-primary/80 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {buttonState.label}
                </button>
              )}
              {pendingBridgeForRoute ? (
                <p className="text-center text-xs text-muted-foreground">
                  Bridge in progress ·{" "}
                  {pendingBridgeStatusLabel.slice(0, 1).toUpperCase() +
                    pendingBridgeStatusLabel.slice(1)}
                </p>
              ) : null}
              {!txError && insufficientBalance ? (
                <p className="text-center text-xs text-destructive">
                  Amount exceeds available balance. Click your balance to use
                  the max.
                </p>
              ) : null}
              {txError ? (
                <p className="text-center text-xs text-destructive">
                  {txError}
                </p>
              ) : null}
            </div>
            <div
              className={cn(
                "flex w-full max-w-md shrink-0 flex-col gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-[0_35px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur transition-[opacity,transform] duration-450 md:w-[24rem] md:max-w-none",
                stakePanelShifted ? "md:translate-x-0" : "md:translate-x-2",
                stakePanelVisible
                  ? "opacity-100"
                  : "pointer-events-none opacity-0 max-h-0 overflow-hidden md:max-h-none md:overflow-visible",
              )}
              aria-hidden={!stakePanelVisible}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      Citrea staking
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deposit Citrea GUSD into the vault to earn yield.
                    </p>
                  </div>
                  <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-foreground/80">
                    APY —
                  </span>
                </div>
              </div>
              <SwapAssetPanel
                label="Stake"
                chainLabel="Citrea"
                selector={renderAssetSelector("gusd")}
                inputProps={{
                  placeholder: "Amount in GUSD",
                  autoComplete: "off",
                  value: stakeAmount,
                  disabled: stakeInputDisabled,
                  onChange: (event) => {
                    setStakeAmount(event.target.value);
                    setStakeAmountTouched(true);
                  },
                }}
                balance={{
                  text: stakeBalanceText,
                  interactive: canUseStakeMax && !stakeInputDisabled,
                  onClick:
                    canUseStakeMax && !stakeInputDisabled
                      ? handleStakeMaxClick
                      : undefined,
                }}
              />
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Est. vault shares
                  </span>
                  <span className="font-semibold text-foreground">
                    {stakePreviewText}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Current stake</span>
                  <span className="font-semibold text-foreground">
                    {stakePositionText.replace("Staked:", "").trim() || "—"}
                  </span>
                </div>
              </div>
              {showStakeActionButton ? (
                <button
                  type="button"
                  onClick={handleStakeAction}
                  disabled={stakeButtonState.disabled}
                  className="h-11 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/95 text-sm font-semibold text-primary-foreground transition hover:from-primary/90 hover:via-primary/80 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {stakeButtonState.label}
                </button>
              ) : null}
              {pendingL1ToCitrea ? (
                <p className="text-center text-xs text-muted-foreground">
                  Bridge in progress ·{" "}
                  {(pendingL1ToCitrea.status ?? "pending")
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/^./, (char) => char.toUpperCase())}
                </p>
              ) : null}
              {!stakeError && stakeInsufficientBalance ? (
                <p className="text-center text-xs text-destructive">
                  Stake amount exceeds your Citrea balance.
                </p>
              ) : null}
              {stakeError ? (
                <p className="text-center text-xs text-destructive">
                  {stakeError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
