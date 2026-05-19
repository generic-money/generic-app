"use client";

import { Options } from "@layerzerolabs/lz-v2-utilities";
import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createPublicClient,
  erc20Abi,
  erc4626Abi,
  formatUnits,
  http,
  isAddress,
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
import { type RedeemSource, useOpportunityRoute } from "@/context";
import { pushAlert } from "@/lib/alerts";
import {
  type CctpBridgeRecord,
  fetchCctpAttestation,
  loadCctpBridgeRecords,
  pruneCctpBridgeRecords,
  saveCctpBridgeRecords,
  upsertCctpBridgeRecord,
} from "@/lib/cctp/iris";
import { CHAINS, getChainNameById } from "@/lib/constants/chains";
import {
  getGenericDepositorAddress,
  getGenericUnitTokenAddress,
} from "@/lib/constants/contracts";
import {
  CCTP_ETHEREUM_DOMAIN,
  CCTP_LINEA_DOMAIN,
  CCTP_MESSAGE_TRANSMITTER_V2_ADDRESS,
  CCTP_STANDARD_FINALITY_THRESHOLD,
  CCTP_TOKEN_MESSENGER_V2_ADDRESS,
  cctpMessageTransmitterV2Abi,
  cctpTokenMessengerV2Abi,
  LINEA_CHAIN_ID,
  LINEA_CHAIN_LABEL,
  LINEA_TOKEN_BRIDGE_ADDRESS,
  lineaMessageServiceAbi,
  lineaTokenBridgeAbi,
  ZERO_BYTES32,
} from "@/lib/constants/linea";
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
import {
  LINEA_BRIDGE_URL,
  LINEASCAN_L1_TO_L2_URL,
  type LineaNativeBridgeRecord,
  loadLineaNativeBridgeRecords,
  pruneLineaNativeBridgeRecords,
  saveLineaNativeBridgeRecords,
  upsertLineaNativeBridgeRecord,
} from "@/lib/linea/native-bridge";
import { getStablecoins, gusd } from "@/lib/models/tokens";
import {
  clearStatusExitProgressRecord,
  loadStatusExitProgressRecords,
  pruneStatusExitProgressRecords,
  type StatusExitProgressRecord,
  saveStatusExitProgressRecords,
  upsertStatusExitProgressRecord,
} from "@/lib/status/exit-progress";
import { type HexAddress, ZERO_ADDRESS } from "@/lib/types/address";
import { cn } from "@/lib/utils";
import { useErc20Decimals } from "./hooks/useErc20Decimals";
import { useErc4626Preview } from "./hooks/useErc4626Preview";
import { useRedeemVaultLiquidity } from "./hooks/useRedeemVaultLiquidity";
import { useTokenAllowance } from "./hooks/useTokenAllowance";
import {
  getRedeemLiquidityState,
  sortLiquidityVaults,
} from "./redeem-liquidity";
import { RedeemLiquidityNotice } from "./redeem-liquidity-notice";
import { SwapAssetPanel } from "./swap-asset-panel";
import { formatBalanceText, formatTokenAmount } from "./utils/format";
import { VaultAvailabilityDialog } from "./vault-availability-dialog";

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
  {
    type: "function",
    name: "withdrawPredeposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "chainNickname", type: "bytes32" },
      { name: "remoteRecipient", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "whitelabel", type: "address" },
    ],
    outputs: [],
  },
] as const;

type AssetType = "stablecoin" | "gusd" | "gunit";
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
type AutoStakeFlowState = {
  active: boolean;
  baselineBalance: bigint;
  startedAt: number;
  requestedAmount: bigint | null;
  arrivedAmount: bigint | null;
  sourceTxHash?: HexBytes;
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
const LZ_RECEIVE_GAS = 250_000;
const LZ_RECEIVE_VALUE = BigInt(0);
const CITREA_NATIVE_DROP = parseUnits("0.000025", 18);
const CITREA_NATIVE_BALANCE_THRESHOLD = BigInt(250_000);
const CITREA_RPC_URL = "https://rpc.mainnet.citrea.xyz";
const ENABLE_LZ_LOGS = process.env.NODE_ENV !== "production";
const LZ_STATUS_POLL_INTERVAL_MS = 15_000;
const CCTP_STATUS_POLL_INTERVAL_MS = 15_000;
const AUTO_STAKE_WAIT_TIMEOUT_MS = 15 * 60 * 1000;
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
  "0x4Fb03AfE959394DB9C4E312A89C6e485FB3732d1" as const satisfies HexAddress;
const CITREA_BRIDGE_PARAMS = "0x" as const satisfies HexData;
const STATUS_DEPOSITS_PAUSED = true;
const STATUS_DEPOSITS_PAUSED_LABEL = "Deposits paused";
const STATUS_DEPOSITS_PAUSED_MESSAGE =
  "Deposits on the Status networks are paused as the chain moves towards its next stage. Funds are safe, you'll hear next steps very soon.";
const STATUS_LINEA_ANNOUNCEMENT_URL =
  "https://x.com/StatusL2/status/2049922023661695094";

const buildCitreaBridgeParams = (receiver: HexBytes) =>
  Options.newOptions()
    .addExecutorLzReceiveOption(LZ_RECEIVE_GAS, LZ_RECEIVE_VALUE)
    .addExecutorNativeDropOption(CITREA_NATIVE_DROP, receiver)
    .toHex() as HexData;

const toBytes32 = (value: HexBytes) =>
  `0x${value.slice(2).padStart(64, "0")}` as const;

const parseStoredAmount = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
};

const formatTxHash = (hash: HexBytes) =>
  `${hash.slice(0, 6)}...${hash.slice(-4)}`;

const formatStablecoinAvailability = (
  amount: bigint,
  decimals: number | undefined,
) => {
  if (decimals == null) {
    return amount.toString();
  }

  return formatTokenAmount(formatUnits(amount, decimals), 2);
};

const buildSelectedVaultLiquidityMessage = ({
  ticker,
  availableAssets,
  decimals,
}: {
  ticker: StablecoinTicker;
  availableAssets: bigint;
  decimals?: number;
}) =>
  `This withdrawal is available, but not fully in ${ticker} right now. The ${ticker} vault currently has ${formatStablecoinAvailability(
    availableAssets,
    decimals,
  )} ${ticker} available. Choose another asset or lower the ${ticker} amount to continue.`;

const buildPostUnwrapLiquidityMessage = ({
  ticker,
}: {
  ticker: StablecoinTicker;
}) =>
  `Your GUSD has already been converted to GUnits, but the ${ticker} vault no longer has enough ${ticker} available for this redemption. The value of your position is unchanged. Choose another asset or try again in a moment.`;

const REDEEM_QUOTE_UNAVAILABLE_MESSAGE =
  "Current redeem output could not be confirmed. Your position remains fully backed. Refresh and try again.";

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

const readLineaTokenBridgeFee = async (client: PublicClient) => {
  try {
    const messageService = await client.readContract({
      abi: lineaTokenBridgeAbi,
      address: LINEA_TOKEN_BRIDGE_ADDRESS,
      functionName: "messageService",
    });

    return await client.readContract({
      abi: lineaMessageServiceAbi,
      address: messageService,
      functionName: "minimumFeeInWei",
    });
  } catch {
    return ZERO_AMOUNT;
  }
};

const buildLayerZeroMessage = (hash: HexBytes) => (
  <span className="inline-flex flex-wrap items-center gap-1.5">
    <span>Hash {formatTxHash(hash)}</span>
    <span className="text-muted-foreground">·</span>
    <a
      href={`https://layerzeroscan.com/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-foreground underline underline-offset-4"
    >
      LayerZeroScan
    </a>
  </span>
);

const buildLineaNativeBridgeMessage = (hash: HexBytes) => (
  <span className="inline-flex flex-wrap items-center gap-1.5">
    <span>Ethereum tx {formatTxHash(hash)} confirmed.</span>
    <span>Track or claim the destination transfer in</span>
    <a
      href={LINEA_BRIDGE_URL}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-foreground underline underline-offset-4"
    >
      Linea bridge
    </a>
    <span>or</span>
    <a
      href={LINEASCAN_L1_TO_L2_URL}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-foreground underline underline-offset-4"
    >
      LineaScan
    </a>
    <span>.</span>
  </span>
);

const notifyTxSubmitted = (
  label: string,
  hash: HexBytes,
  messageOverride?: ReactNode,
) => {
  pushAlert({
    type: "info",
    title: `${label} submitted`,
    message: messageOverride ?? `Hash ${formatTxHash(hash)}`,
  });
};

const notifyTxConfirmed = (
  label: string,
  hash: HexBytes,
  messageOverride?: ReactNode,
) => {
  pushAlert({
    type: "success",
    title: `${label} confirmed`,
    message: messageOverride ?? `Hash ${formatTxHash(hash)}`,
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
  badge?: string;
  formDescription: string;
  iconSrc?: string;
  iconAlt?: string;
};

const OPPORTUNITY_OPTIONS: OpportunityOption[] = [
  {
    value: "citrea",
    eyebrow: "Citrea GUSD",
    title: "Bitcoin's first zk Rollup",
    description: "Access the BTC DeFi layer",
    badge: `Up to ${OPPORTUNITY_APY_CAP.citrea} APY`,
    note: "L2-native settlement",
    formDescription: "Mint Citrea-native GUSD with stablecoins",
    iconSrc: "/chains/citrea.png",
    iconAlt: "Citrea",
  },
  {
    value: "predeposit",
    eyebrow: "Status L2 GUSD",
    title: "Status withdrawals",
    description: "Withdraw predeposits into USDC or USDT",
    badge: "Withdrawals open",
    note: "Linea optional",
    formDescription: "Withdraw your Status predeposit into collateral",
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
        <div className="mt-auto flex items-center justify-between gap-3 text-[11px] font-semibold text-foreground/70">
          {option.badge ? (
            <span className="whitespace-nowrap rounded-full border border-border/60 bg-background/70 px-2.5 py-0.5">
              {option.badge}
            </span>
          ) : null}
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
  const {
    route: depositRoute,
    setRoute: setDepositRoute,
    flow,
    setFlow,
    redeemEntryRequest,
  } = useOpportunityRoute();
  const shouldForceStatusWithdraw =
    STATUS_DEPOSITS_PAUSED && depositRoute === "predeposit";
  const effectiveFlow = shouldForceStatusWithdraw ? "redeem" : flow;
  const isDepositFlow = effectiveFlow === "deposit";
  const isCitreaReturnFlow = !isDepositFlow && depositRoute === "citrea";
  const stablecoinChainName = isCitreaReturnFlow ? CHAINS.MAINNET : chainName;
  const stablecoins = useMemo(
    () => getStablecoins(stablecoinChainName),
    [stablecoinChainName],
  );
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
  const [isVaultAvailabilityDialogOpen, setIsVaultAvailabilityDialogOpen] =
    useState(false);
  const [redeemSource, setRedeemSource] = useState<RedeemSource>("gusd");
  const [pendingRedeemMaxPrefill, setPendingRedeemMaxPrefill] = useState<{
    id: number;
    source: RedeemSource;
  } | null>(null);
  const [useCustomLineaRecipient, setUseCustomLineaRecipient] = useState(false);
  const [lineaRecipientInput, setLineaRecipientInput] = useState("");
  const isPredepositRedeem = !isDepositFlow && depositRoute === "predeposit";
  const selectableStablecoins = useMemo(
    () =>
      isPredepositRedeem
        ? stablecoins.filter((coin) => coin.ticker !== "USDS")
        : stablecoins,
    [isPredepositRedeem, stablecoins],
  );
  const isMainnetRedeem =
    !isDepositFlow && !isCitreaReturnFlow && depositRoute === "mainnet";
  const isGunitRedeem = isMainnetRedeem && redeemSource === "gunit";
  const isOnMainnet = activeChainId === MAINNET_CHAIN_ID;
  const requiredChainId = isCitreaReturnFlow
    ? isOnMainnet
      ? MAINNET_CHAIN_ID
      : CITREA_CHAIN_ID_NUMBER
    : MAINNET_CHAIN_ID;
  const requiredChainLabel =
    requiredChainId === MAINNET_CHAIN_ID ? "Ethereum" : "Citrea";
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
  const [stakeMode, setStakeMode] = useState<"stake" | "unstake">("stake");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [unstakeStep, setUnstakeStep] = useState<"idle" | "submitting">("idle");
  const [pendingStakeAmount, setPendingStakeAmount] = useState<bigint | null>(
    null,
  );
  const [bridgeStakeState, setBridgeStakeState] = useState<
    "idle" | "bridging" | "waiting" | "ready" | "staking" | "error"
  >("idle");
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [unstakeError, setUnstakeError] = useState<string | null>(null);
  const [autoStakeFlow, setAutoStakeFlow] = useState<AutoStakeFlowState | null>(
    null,
  );
  const [autoSwitchRequested, setAutoSwitchRequested] = useState(false);
  const [stakePanelShifted, setStakePanelShifted] = useState(false);
  const [stakePanelVisible, setStakePanelVisible] = useState(false);
  const [lzBridgeRecords, setLzBridgeRecords] = useState<LzBridgeRecord[]>([]);
  const [cctpBridgeRecords, setCctpBridgeRecords] = useState<
    CctpBridgeRecord[]
  >([]);
  const [lineaNativeBridgeRecords, setLineaNativeBridgeRecords] = useState<
    LineaNativeBridgeRecord[]
  >([]);
  const [statusExitProgressRecords, setStatusExitProgressRecords] = useState<
    StatusExitProgressRecord[]
  >([]);
  const [citreaNativeBalance, setCitreaNativeBalance] = useState<bigint | null>(
    null,
  );
  const [_isCitreaNativeBalanceLoading, setIsCitreaNativeBalanceLoading] =
    useState(false);
  const [isCitreaNativeBalanceError, setIsCitreaNativeBalanceError] =
    useState(false);
  const processedRedeemEntryRequestIdRef = useRef(0);
  const citreaClient = useMemo(
    () => createPublicClient({ transport: http(CITREA_RPC_URL) }),
    [],
  );
  const statusExitProgress = useMemo(() => {
    if (!accountAddress || !isPredepositRedeem) {
      return null;
    }

    return (
      statusExitProgressRecords.find(
        (record) =>
          record.account.toLowerCase() === accountAddress.toLowerCase(),
      ) ?? null
    );
  }, [accountAddress, isPredepositRedeem, statusExitProgressRecords]);
  const statusExitProgressShares = parseStoredAmount(
    statusExitProgress?.shares,
  );
  const statusExitProgressCollateralAmount = parseStoredAmount(
    statusExitProgress?.collateralAmount,
  );
  const isStatusExitGunitResume = statusExitProgress?.stage === "gunit";
  const isStatusExitCollateralResume =
    statusExitProgress?.stage === "collateral";

  useEffect(() => {
    if (!shouldForceStatusWithdraw || flow === "redeem") {
      return;
    }

    setFlow("redeem");
  }, [flow, setFlow, shouldForceStatusWithdraw]);

  useEffect(() => {
    if (!selectableStablecoins.find((coin) => coin.ticker === selectedTicker)) {
      setSelectedTicker(selectableStablecoins[0]?.ticker ?? "USDC");
    }
  }, [selectedTicker, selectableStablecoins]);

  useEffect(() => {
    if (
      !isPredepositRedeem ||
      !statusExitProgress ||
      statusExitProgress.ticker === selectedTicker
    ) {
      return;
    }

    setSelectedTicker(statusExitProgress.ticker);
  }, [isPredepositRedeem, selectedTicker, statusExitProgress]);

  useEffect(() => {
    if (!redeemEntryRequest) {
      return;
    }

    if (redeemEntryRequest.id <= processedRedeemEntryRequestIdRef.current) {
      return;
    }

    processedRedeemEntryRequestIdRef.current = redeemEntryRequest.id;
    setRedeemSource(redeemEntryRequest.source);

    if (redeemEntryRequest.prefill === "max") {
      setPendingRedeemMaxPrefill({
        id: redeemEntryRequest.id,
        source: redeemEntryRequest.source,
      });
      return;
    }

    setPendingRedeemMaxPrefill(null);
  }, [redeemEntryRequest]);

  const selectedStablecoin = useMemo(
    () =>
      selectableStablecoins.find((coin) => coin.ticker === selectedTicker) ??
      selectableStablecoins[0],
    [selectedTicker, selectableStablecoins],
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
      ? "Bridge Citrea GUSD back to mainnet, then redeem into your selected stablecoin."
      : isPredepositRedeem
        ? "Withdraw your Status predeposit, redeem into collateral, and optionally bridge it to Linea."
        : isGunitRedeem
          ? "Redeem GUnits back into your selected stablecoin."
          : "Redeem GUSD back into your selected stablecoin.";
  const showRedeemSourceSelector = isMainnetRedeem;

  const canSwitchDirection = !shouldForceStatusWithdraw;

  const handleSwitchDirection = () => {
    if (!canSwitchDirection) {
      return;
    }

    setPostMintHref(null);
    setFlow(isDepositFlow ? "redeem" : "deposit");
  };

  const handleStablecoinChange = (value: StablecoinTicker) => {
    if (statusExitProgress) {
      return;
    }

    setPostMintHref(null);
    setSelectedTicker(value);
  };

  const handleRedeemSourceChange = (nextSource: RedeemSource) => {
    setPostMintHref(null);
    setPendingRedeemMaxPrefill(null);
    setRedeemSource(nextSource);
  };

  const l1GusdAddress = gusd.getAddress(chainName);
  const gusdAddress =
    isCitreaReturnFlow && !isOnMainnet
      ? CITREA_WHITELABEL_ADDRESS
      : l1GusdAddress;
  const depositorAddress = getGenericDepositorAddress(chainName);
  const genericUnitTokenAddress = getGenericUnitTokenAddress(chainName);

  const stablecoinAddress = selectedStablecoin?.tokenAddress;
  const vaultAddress = selectedStablecoin?.depositVaultAddress as
    | HexAddress
    | undefined;
  const isStatusExitProgressSelectionReady =
    !statusExitProgress ||
    (statusExitProgress.ticker === selectedTicker &&
      statusExitProgress.stablecoinAddress.toLowerCase() ===
        stablecoinAddress?.toLowerCase() &&
      statusExitProgress.vaultAddress.toLowerCase() ===
        vaultAddress?.toLowerCase());
  const stablecoinChainId = MAINNET_CHAIN_ID;
  const gusdChainId =
    isCitreaReturnFlow && !isOnMainnet
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
  const { decimals: genericUnitDecimals } = useErc20Decimals(
    genericUnitTokenAddress,
    MAINNET_CHAIN_ID,
  );
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

  useEffect(() => {
    if (!isMainnetRedeem && redeemSource !== "gusd") {
      setRedeemSource("gusd");
    }
  }, [isMainnetRedeem, redeemSource]);

  useEffect(() => {
    let cancelled = false;
    const shouldFetch = Boolean(accountAddress && isCitreaDeposit);

    if (!shouldFetch) {
      setCitreaNativeBalance(null);
      setIsCitreaNativeBalanceLoading(false);
      setIsCitreaNativeBalanceError(false);
      return;
    }

    setIsCitreaNativeBalanceLoading(true);
    setIsCitreaNativeBalanceError(false);

    citreaClient
      .getBalance({ address: accountAddress as HexAddress })
      .then((balance) => {
        if (cancelled) {
          return;
        }
        setCitreaNativeBalance(balance);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Citrea native balance fetch error", error);
          setIsCitreaNativeBalanceError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCitreaNativeBalanceLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountAddress, citreaClient, isCitreaDeposit]);

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

  const genericUnitBalance = useBalance({
    address: accountAddress,
    token: genericUnitTokenAddress,
    chainId: MAINNET_CHAIN_ID,
    query: {
      enabled: Boolean(accountAddress && genericUnitTokenAddress),
    },
  });
  const hasGunitBalance =
    (genericUnitBalance.data?.value ?? ZERO_AMOUNT) > ZERO_AMOUNT;
  const showGunitRedeemSourceOption =
    showRedeemSourceSelector && hasGunitBalance;

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
    query: {
      enabled: Boolean(accountAddress),
    },
  });

  const citreaVaultBalance = useBalance({
    address: accountAddress,
    token: CITREA_VAULT_ADDRESS,
    chainId: CITREA_CHAIN_ID_NUMBER,
    query: {
      enabled: Boolean(accountAddress),
    },
  });

  useEffect(() => {
    if (showGunitRedeemSourceOption || redeemSource !== "gunit") {
      return;
    }

    setRedeemSource("gusd");
    setPendingRedeemMaxPrefill(null);
  }, [redeemSource, showGunitRedeemSourceOption]);

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
        value: statusPredepositAmount,
      },
    };
  }, [
    gusdDecimals,
    isStatusPredepositError,
    isStatusPredepositLoading,
    statusPredepositAmount,
  ]);

  const fromAssetType: AssetType = isDepositFlow
    ? "stablecoin"
    : isStatusExitCollateralResume
      ? "stablecoin"
      : isGunitRedeem || isStatusExitGunitResume
        ? "gunit"
        : "gusd";

  const toAssetType: AssetType = isDepositFlow ? "gusd" : "stablecoin";

  const fromBalanceHook =
    fromAssetType === "stablecoin"
      ? stablecoinBalance
      : fromAssetType === "gunit"
        ? genericUnitBalance
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset amount when the active flow context changes
  useEffect(() => {
    setFromAmount("");
  }, [isDepositFlow, depositRoute, chainName, redeemSource]);

  useEffect(() => {
    if (!isDepositFlow) {
      return;
    }

    void selectedTicker;
    setFromAmount("");
  }, [isDepositFlow, selectedTicker]);

  useEffect(() => {
    if (!isPredepositRedeem) {
      return;
    }

    if (isStatusExitGunitResume) {
      if (statusExitProgressShares == null || genericUnitDecimals == null) {
        setFromAmount("");
        return;
      }

      setFromAmount(formatUnits(statusExitProgressShares, genericUnitDecimals));
      return;
    }

    if (isStatusExitCollateralResume) {
      if (
        statusExitProgressCollateralAmount == null ||
        stablecoinDecimals == null
      ) {
        setFromAmount("");
        return;
      }

      setFromAmount(
        formatUnits(statusExitProgressCollateralAmount, stablecoinDecimals),
      );
      return;
    }

    if (statusPredepositAmount == null || gusdDecimals == null) {
      setFromAmount("");
      return;
    }

    setFromAmount(formatUnits(statusPredepositAmount, gusdDecimals));
  }, [
    genericUnitDecimals,
    gusdDecimals,
    isPredepositRedeem,
    isStatusExitCollateralResume,
    isStatusExitGunitResume,
    stablecoinDecimals,
    statusExitProgressCollateralAmount,
    statusExitProgressShares,
    statusPredepositAmount,
  ]);

  useEffect(() => {
    if (isPredepositRedeem) {
      return;
    }

    setUseCustomLineaRecipient(false);
    setLineaRecipientInput("");
  }, [isPredepositRedeem]);

  useEffect(() => {
    if (depositRoute !== "citrea") {
      setStakeAfterBridge(false);
      setStakeAmountTouched(false);
      setStakeMode("stake");
      setUnstakeAmount("");
      setUnstakeStep("idle");
      setBridgeStakeState("idle");
      setPendingStakeAmount(null);
      setStakeError(null);
      setUnstakeError(null);
      setAutoStakeFlow(null);
      setAutoSwitchRequested(false);
      return;
    }

    if (isDepositFlow) {
      setStakeAfterBridge(true);
      setStakeMode("stake");
    }
  }, [depositRoute, isDepositFlow]);

  useEffect(() => {
    if (
      !stakeAfterBridge ||
      stakeMode !== "stake" ||
      stakeAmountTouched ||
      bridgeStakeState !== "idle"
    ) {
      return;
    }

    setStakeAmount(fromAmount);
  }, [
    bridgeStakeState,
    fromAmount,
    stakeAfterBridge,
    stakeAmountTouched,
    stakeMode,
  ]);

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
    setCctpBridgeRecords(loadCctpBridgeRecords());
  }, []);

  useEffect(() => {
    setLineaNativeBridgeRecords(loadLineaNativeBridgeRecords());
  }, []);

  useEffect(() => {
    setStatusExitProgressRecords(loadStatusExitProgressRecords());
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
    const pruned = pruneCctpBridgeRecords(cctpBridgeRecords);
    if (pruned !== cctpBridgeRecords) {
      setCctpBridgeRecords(pruned);
      return;
    }
    saveCctpBridgeRecords(pruned);
  }, [cctpBridgeRecords]);

  useEffect(() => {
    const pruned = pruneLineaNativeBridgeRecords(lineaNativeBridgeRecords);
    if (pruned !== lineaNativeBridgeRecords) {
      setLineaNativeBridgeRecords(pruned);
      return;
    }
    saveLineaNativeBridgeRecords(pruned);
  }, [lineaNativeBridgeRecords]);

  useEffect(() => {
    const pruned = pruneStatusExitProgressRecords(statusExitProgressRecords);
    if (pruned !== statusExitProgressRecords) {
      setStatusExitProgressRecords(pruned);
      return;
    }
    saveStatusExitProgressRecords(pruned);
  }, [statusExitProgressRecords]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLzBridgeRecords((current) => pruneLzBridgeRecords(current));
    }, 1000);

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
  const isStatusDepositsPaused = STATUS_DEPOSITS_PAUSED && isStatusDeposit;
  const statusPredepositBalanceText = isStatusDeposit
    ? formatBalanceText(statusPredepositBalance, accountAddress, {
        fixedDecimals: 2,
      }).replace(/^Balance:/, "Predeposited:")
    : null;
  const finalToBalanceText = statusPredepositBalanceText ?? toBalanceText;
  const fromBalanceFormatted = fromBalanceHook.data?.formatted;

  useEffect(() => {
    if (!pendingRedeemMaxPrefill) {
      return;
    }

    if (!isMainnetRedeem || isCitreaReturnFlow) {
      return;
    }

    if (pendingRedeemMaxPrefill.source !== redeemSource) {
      return;
    }

    if (fromBalanceHook.isError) {
      setPendingRedeemMaxPrefill(null);
      return;
    }

    if (!fromBalanceFormatted) {
      return;
    }

    setFromAmount(fromBalanceFormatted);
    setPendingRedeemMaxPrefill(null);
  }, [
    fromBalanceFormatted,
    fromBalanceHook.isError,
    isCitreaReturnFlow,
    isMainnetRedeem,
    pendingRedeemMaxPrefill,
    redeemSource,
  ]);

  const canUseMax =
    !isPredepositRedeem &&
    Boolean(accountAddress) &&
    Boolean(fromBalanceHook.data?.formatted);
  const isCitreaNativeBalancePending =
    isCitreaDeposit &&
    !isCitreaNativeBalanceError &&
    citreaNativeBalance == null;
  const shouldUseCitreaNativeDrop =
    citreaNativeBalance == null
      ? true
      : citreaNativeBalance < CITREA_NATIVE_BALANCE_THRESHOLD;

  const handleMaxClick = () => {
    const value = fromBalanceHook.data?.formatted;
    if (value) {
      setFromAmount(value);
    }
  };

  const canUseStakeMax =
    Boolean(accountAddress) && Boolean(citreaGusdBalance.data?.formatted);
  const canUseUnstakeMax =
    Boolean(accountAddress) && Boolean(citreaVaultBalance.data?.formatted);

  const handleStakeMaxClick = () => {
    const value = citreaGusdBalance.data?.formatted;
    if (value) {
      setStakeAmount(value);
      setStakeAmountTouched(true);
    }
  };

  const handleUnstakeMaxClick = () => {
    const value = citreaVaultBalance.data?.formatted;
    if (value) {
      setUnstakeAmount(value);
    }
  };

  const fromDecimals =
    fromAssetType === "stablecoin"
      ? stablecoinDecimals
      : fromAssetType === "gunit"
        ? genericUnitDecimals
        : gusdDecimals;
  const toDecimals =
    toAssetType === "stablecoin" ? stablecoinDecimals : gusdDecimals;

  const shouldUseVaultPreview = isDepositFlow
    ? !isNonMainnetDeposit && !shouldSwitchChain
    : !isStatusExitCollateralResume &&
      !shouldSwitchChain &&
      (!isCitreaReturnFlow || isOnMainnet);

  const {
    quote: previewToAmount,
    rawQuote: previewToAmountRaw,
    parsedAmount,
    isError: isPreviewToAmountError,
    isFetching: isPreviewToAmountFetching,
    isLoading: isPreviewToAmountLoading,
  } = useErc4626Preview({
    amount: fromAmount,
    fromDecimals,
    toDecimals,
    vaultAddress: shouldUseVaultPreview ? vaultAddress : undefined,
    mode: isDepositFlow ? "deposit" : "redeem",
  });

  const shouldGuardRedeemLiquidity =
    !isDepositFlow &&
    !isStatusExitCollateralResume &&
    (!isCitreaReturnFlow || isOnMainnet) &&
    Boolean(vaultAddress);
  const redeemVaultLiquidity = useRedeemVaultLiquidity({
    enabled: shouldGuardRedeemLiquidity,
    selectedTicker,
  });
  const redeemLiquidityState = useMemo(
    () =>
      getRedeemLiquidityState({
        enabled: shouldGuardRedeemLiquidity,
        isLoading: redeemVaultLiquidity.status === "loading",
        isUnavailable: redeemVaultLiquidity.status === "unavailable",
        selectedVault: redeemVaultLiquidity.selectedVault,
        requestedAssets: !isDepositFlow ? (previewToAmountRaw ?? null) : null,
      }),
    [
      isDepositFlow,
      previewToAmountRaw,
      redeemVaultLiquidity.selectedVault,
      redeemVaultLiquidity.status,
      shouldGuardRedeemLiquidity,
    ],
  );
  const redeemLiquidityVaults = useMemo(() => {
    const selectableTickers = selectableStablecoins.map((coin) => coin.ticker);

    return sortLiquidityVaults(
      (redeemVaultLiquidity.data?.vaults ?? []).filter((vault) =>
        selectableTickers.includes(vault.ticker),
      ),
      selectableTickers,
    );
  }, [redeemVaultLiquidity.data?.vaults, selectableStablecoins]);
  const hasEnteredRedeemAmount = Boolean(
    !isDepositFlow && parsedAmount && parsedAmount > ZERO_AMOUNT,
  );
  const isRedeemQuotePending =
    hasEnteredRedeemAmount &&
    shouldUseVaultPreview &&
    !isPreviewToAmountError &&
    (isPreviewToAmountLoading ||
      isPreviewToAmountFetching ||
      previewToAmountRaw == null);
  const isRedeemQuoteUnavailable =
    hasEnteredRedeemAmount &&
    shouldUseVaultPreview &&
    (isPreviewToAmountError ||
      (!isPreviewToAmountLoading &&
        !isPreviewToAmountFetching &&
        previewToAmountRaw == null));
  const shouldShowRedeemLiquidityNotice = Boolean(
    hasEnteredRedeemAmount &&
      (redeemLiquidityState.phase === "loading" ||
        redeemLiquidityState.phase === "insufficient" ||
        redeemLiquidityState.phase === "unavailable"),
  );

  useEffect(() => {
    if (isDepositFlow || !shouldGuardRedeemLiquidity) {
      setIsVaultAvailabilityDialogOpen(false);
    }
  }, [isDepositFlow, shouldGuardRedeemLiquidity]);

  const estimatedToAmount = shouldUseVaultPreview
    ? previewToAmount
    : fromAmount;
  const fromPlaceholder = isPredepositRedeem
    ? "Status predeposit amount"
    : fromAssetType === "stablecoin"
      ? `Amount in ${selectedStablecoin?.ticker ?? ""}`
      : fromAssetType === "gunit"
        ? "Amount in GUnits"
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
    chainIdOverride: !isDepositFlow ? MAINNET_CHAIN_ID : undefined,
  });

  const {
    allowance: citreaAllowance,
    refetchAllowance: refetchCitreaAllowance,
  } = useTokenAllowance({
    token: isCitreaReturnFlow ? CITREA_WHITELABEL_ADDRESS : undefined,
    owner: accountAddress,
    spender: isCitreaReturnFlow ? BRIDGE_COORDINATOR_L2_ADDRESS : undefined,
    chainIdOverride: isCitreaReturnFlow ? CITREA_CHAIN_ID_NUMBER : undefined,
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
      ? isOnMainnet
        ? needsRedeemApproval
        : needsCitreaApproval
      : isPredepositRedeem
        ? false
        : needsRedeemApproval;
  const fromBalanceValue = (() => {
    const data = fromBalanceHook.data;
    if (data && typeof data === "object" && "value" in data) {
      return (data as { value?: bigint }).value;
    }
    return undefined;
  })();
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
  const unstakeParsedAmount = useMemo(() => {
    if (!citreaVaultDecimals || unstakeAmount.trim() === "") {
      return null;
    }

    try {
      return parseUnits(unstakeAmount, citreaVaultDecimals);
    } catch {
      return null;
    }
  }, [citreaVaultDecimals, unstakeAmount]);
  const stakeTargetAmount = pendingStakeAmount ?? stakeParsedAmount;
  const stakeBalanceValue = citreaGusdBalance.data?.value;
  const unstakeBalanceValue = citreaVaultBalance.data?.value;
  const stakeInsufficientBalance = Boolean(
    stakeTargetAmount &&
      stakeBalanceValue !== undefined &&
      stakeTargetAmount > stakeBalanceValue,
  );
  const canFundStakeFromCurrentCitreaBalance = Boolean(
    stakeTargetAmount &&
      stakeTargetAmount > ZERO_AMOUNT &&
      stakeBalanceValue !== undefined &&
      stakeTargetAmount <= stakeBalanceValue,
  );
  const unstakeInsufficientBalance = Boolean(
    unstakeParsedAmount &&
      unstakeBalanceValue !== undefined &&
      unstakeParsedAmount > unstakeBalanceValue,
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
  const unstakePreviewAmount = unstakeParsedAmount ?? ZERO_AMOUNT;
  const unstakePreviewEnabled = Boolean(
    unstakeParsedAmount && unstakeParsedAmount > ZERO_AMOUNT,
  );
  const { data: unstakePreviewGusd } = useReadContract({
    address: CITREA_VAULT_ADDRESS,
    abi: erc4626Abi,
    chainId: CITREA_CHAIN_ID_NUMBER,
    functionName: "previewRedeem",
    args: [unstakePreviewAmount],
    query: {
      enabled: unstakePreviewEnabled,
    },
  });
  const unstakePreviewText =
    unstakePreviewGusd != null && citreaGusdDecimals != null
      ? formatTokenAmount(
          formatUnits(unstakePreviewGusd, citreaGusdDecimals),
          6,
        )
      : "—";
  const stakeBalanceText = formatTokenBalanceText(
    citreaGusdBalance,
    accountAddress,
    "GUSD",
  );
  const unstakeBalanceText = formatTokenBalanceText(
    citreaVaultBalance,
    accountAddress,
    "sGUSD",
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
  const isStakeMode = stakeMode === "stake";
  const isUnstakeMode = stakeMode === "unstake";
  const showStakePanel =
    depositRoute === "citrea" &&
    (stakeAfterBridge ||
      hasCitreaStakePosition ||
      hasCitreaGusdBalance ||
      bridgeStakeState !== "idle");
  const showStakeActionButton = Boolean(
    accountAddress &&
      (isStakeMode ? hasCitreaGusdBalance : hasCitreaStakePosition),
  );
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
  const pendingLzPollKey = useMemo(
    () =>
      pendingLzRecords
        .map((record) => record.txHash.toLowerCase())
        .sort()
        .join("|"),
    [pendingLzRecords],
  );
  const pendingLzRecordsRef = useRef<LzBridgeRecord[]>(pendingLzRecords);
  const lzStatusPollInFlightRef = useRef(false);
  const cctpPollInFlightRef = useRef(false);
  const pendingL1ToCitrea = pendingLzRecords.find(
    (record) => record.direction === "l1-to-citrea",
  );
  const pendingCitreaToL1 = pendingLzRecords.find(
    (record) => record.direction === "citrea-to-l1",
  );
  const pendingCctpRecord = useMemo(() => {
    if (!accountAddress) {
      return null;
    }

    return (
      cctpBridgeRecords.find(
        (record) =>
          record.account.toLowerCase() === accountAddress.toLowerCase() &&
          record.status !== "minted",
      ) ?? null
    );
  }, [accountAddress, cctpBridgeRecords]);
  const pendingLineaNativeBridgeRecord = useMemo(() => {
    if (!accountAddress) {
      return null;
    }

    return (
      lineaNativeBridgeRecords.find(
        (record) =>
          record.account.toLowerCase() === accountAddress.toLowerCase() &&
          record.status === "submitted",
      ) ?? null
    );
  }, [accountAddress, lineaNativeBridgeRecords]);
  const pendingCctpAttestationReady =
    pendingCctpRecord?.status === "attested" &&
    Boolean(pendingCctpRecord.message && pendingCctpRecord.attestation);
  const customLineaRecipient = lineaRecipientInput.trim();
  const isCustomLineaRecipientValid =
    !useCustomLineaRecipient || isAddress(customLineaRecipient);
  const lineaRecipient =
    useCustomLineaRecipient && isAddress(customLineaRecipient)
      ? (customLineaRecipient as HexAddress)
      : accountAddress;
  const isBridgeToCitreaPending =
    bridgeStakeState === "bridging" ||
    bridgeStakeState === "waiting" ||
    Boolean(pendingL1ToCitrea);
  const isStakeAutoBridgeFlow = isCitreaDeposit && stakeAfterBridge;
  const isStakeAutoBridgePending =
    isStakeAutoBridgeFlow &&
    (bridgeStakeState === "bridging" ||
      bridgeStakeState === "waiting" ||
      bridgeStakeState === "ready");
  const shouldBlockStakeForBridge = Boolean(
    isStakeAutoBridgePending &&
      stakeTargetAmount &&
      stakeTargetAmount > ZERO_AMOUNT &&
      !canFundStakeFromCurrentCitreaBalance,
  );
  const isAutoStakeFlowInProgress = Boolean(
    autoStakeFlow?.active &&
      (bridgeStakeState === "bridging" ||
        bridgeStakeState === "waiting" ||
        bridgeStakeState === "ready" ||
        bridgeStakeState === "staking"),
  );
  const pendingBridgeForRoute = isCitreaReturnFlow
    ? pendingCitreaToL1
    : isCitreaDeposit
      ? pendingL1ToCitrea
      : null;
  const pendingBridgeStatusLabel = pendingBridgeForRoute?.status
    ? pendingBridgeForRoute.status.replace(/_/g, " ").toLowerCase()
    : "pending";
  const latestCitreaToL1 = useMemo(() => {
    if (!accountAddress) {
      return null;
    }

    return lzBridgeRecords.reduce<LzBridgeRecord | null>((latest, record) => {
      if (record.direction !== "citrea-to-l1") {
        return latest;
      }
      if (record.account.toLowerCase() !== accountAddress.toLowerCase()) {
        return latest;
      }
      if (!latest || record.createdAt > latest.createdAt) {
        return record;
      }
      return latest;
    }, null);
  }, [accountAddress, lzBridgeRecords]);
  const citreaReturnStatus = latestCitreaToL1?.status;
  const citreaReturnDelivered =
    (citreaReturnStatus ?? "").toUpperCase() === "DELIVERED";
  const citreaReturnFinal = isFinalLzStatus(citreaReturnStatus);
  const citreaReturnStatusLabel = citreaReturnStatus
    ? citreaReturnStatus.replace(/_/g, " ").toLowerCase()
    : "pending";
  const citreaReturnPending = Boolean(pendingCitreaToL1);
  const hasMainnetGusdBalance =
    (gusdMainnetBalance.data?.value ?? ZERO_AMOUNT) > ZERO_AMOUNT;
  const citreaReturnReadyForRedeem = Boolean(
    isCitreaReturnFlow && (hasMainnetGusdBalance || citreaReturnDelivered),
  );

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
    pendingLzRecordsRef.current = pendingLzRecords;
  }, [pendingLzRecords]);

  useEffect(() => {
    if (!pendingLzPollKey) {
      return;
    }

    if (!pendingLzRecordsRef.current.length) {
      return;
    }

    let cancelled = false;

    const pollStatuses = async () => {
      if (lzStatusPollInFlightRef.current) {
        return;
      }

      lzStatusPollInFlightRef.current = true;

      try {
        const records = pendingLzRecordsRef.current;
        if (!records.length) {
          return;
        }

        const updates = await Promise.all(
          records.map(async (record) => {
            try {
              const status = await fetchLzMessageStatus(record.txHash, {
                srcEid: record.srcEid,
                dstEid: record.dstEid,
              });
              const statusName = status.statusName ?? record.status;
              const statusMessage =
                status.statusMessage ?? record.statusMessage;
              const guid = status.guid ?? record.guid;
              const statusChanged =
                statusName !== record.status ||
                statusMessage !== record.statusMessage ||
                guid !== record.guid;
              const shouldFinalizeNow =
                isFinalLzStatus(statusName) && record.finalizedAt == null;

              if (ENABLE_LZ_LOGS && (statusChanged || shouldFinalizeNow)) {
                console.info("LZ poll: status fetched", {
                  txHash: record.txHash,
                  status: statusName,
                  guid,
                });
              }

              if (!statusChanged && !shouldFinalizeNow) {
                return {
                  txHash: record.txHash,
                  changed: false as const,
                };
              }

              const now = Date.now();
              return {
                txHash: record.txHash,
                changed: true as const,
                status: statusName,
                statusMessage,
                guid,
                updatedAt: now,
                finalizedAt: shouldFinalizeNow ? now : record.finalizedAt,
              };
            } catch {
              if (ENABLE_LZ_LOGS) {
                console.warn("LZ poll: status fetch failed", {
                  txHash: record.txHash,
                });
              }

              return {
                txHash: record.txHash,
                changed: false as const,
              };
            }
          }),
        );

        if (cancelled) {
          return;
        }

        setLzBridgeRecords((current) => {
          const changedUpdates = updates.filter((item) => item.changed);
          if (!changedUpdates.length) {
            return current;
          }

          const updateMap = new Map(
            changedUpdates.map((item) => [item.txHash.toLowerCase(), item]),
          );
          let hasChanges = false;

          const next = current.map((record) => {
            const updated = updateMap.get(record.txHash.toLowerCase());
            if (!updated) {
              return record;
            }

            const nextRecord = {
              ...record,
              status: updated.status,
              statusMessage: updated.statusMessage,
              guid: updated.guid,
              updatedAt: updated.updatedAt,
              finalizedAt: updated.finalizedAt,
            };
            const unchanged =
              nextRecord.status === record.status &&
              nextRecord.statusMessage === record.statusMessage &&
              nextRecord.guid === record.guid &&
              nextRecord.finalizedAt === record.finalizedAt;

            if (unchanged) {
              return record;
            }

            if (ENABLE_LZ_LOGS && updated.status !== record.status) {
              console.info("LZ poll: status updated", {
                txHash: record.txHash,
                from: record.status ?? "unknown",
                to: updated.status,
              });
            }

            hasChanges = true;
            return nextRecord;
          });

          return hasChanges ? next : current;
        });
      } finally {
        lzStatusPollInFlightRef.current = false;
      }
    };

    void pollStatuses();
    const interval = window.setInterval(() => {
      void pollStatuses();
    }, LZ_STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingLzPollKey]);

  useEffect(() => {
    if (!pendingCctpRecord || pendingCctpRecord.status !== "submitted") {
      return;
    }

    let cancelled = false;

    const pollAttestation = async () => {
      if (cctpPollInFlightRef.current) {
        return;
      }

      cctpPollInFlightRef.current = true;

      try {
        const attestation = await fetchCctpAttestation({
          txHash: pendingCctpRecord.txHash,
          sourceDomain: pendingCctpRecord.sourceDomain,
        });

        if (cancelled || !attestation) {
          return;
        }

        setCctpBridgeRecords((current) =>
          current.map((record) =>
            record.txHash.toLowerCase() ===
            pendingCctpRecord.txHash.toLowerCase()
              ? {
                  ...record,
                  status: "attested",
                  message: attestation.message,
                  attestation: attestation.attestation,
                  updatedAt: Date.now(),
                }
              : record,
          ),
        );
      } catch (error) {
        if (ENABLE_LZ_LOGS) {
          console.warn("CCTP poll: attestation fetch failed", {
            txHash: pendingCctpRecord.txHash,
            error,
          });
        }
      } finally {
        cctpPollInFlightRef.current = false;
      }
    };

    void pollAttestation();
    const interval = window.setInterval(() => {
      void pollAttestation();
    }, CCTP_STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingCctpRecord]);

  useEffect(() => {
    if (
      bridgeStakeState !== "waiting" ||
      !autoStakeFlow?.active ||
      stakeBalanceValue === undefined
    ) {
      return;
    }

    const delta = stakeBalanceValue - autoStakeFlow.baselineBalance;
    if (delta > ZERO_AMOUNT) {
      setPendingStakeAmount(delta);
      setAutoStakeFlow((current) =>
        current
          ? {
              ...current,
              arrivedAmount: delta,
            }
          : current,
      );
      setBridgeStakeState("ready");
    }
  }, [autoStakeFlow, bridgeStakeState, stakeBalanceValue]);

  useEffect(() => {
    if (bridgeStakeState !== "waiting" || !autoStakeFlow?.active) {
      return;
    }

    const elapsed = Date.now() - autoStakeFlow.startedAt;
    const remaining = AUTO_STAKE_WAIT_TIMEOUT_MS - elapsed;
    const timeoutDelay = Math.max(0, remaining);

    const timeoutId = window.setTimeout(() => {
      setBridgeStakeState((current) =>
        current === "waiting" ? "error" : current,
      );
      setStakeError((current) => {
        if (current) {
          return current;
        }

        return "Bridge is taking longer than expected. You can stake manually once your Citrea balance updates.";
      });
      setAutoStakeFlow((current) =>
        current
          ? {
              ...current,
              active: false,
            }
          : current,
      );
    }, timeoutDelay);

    return () => window.clearTimeout(timeoutId);
  }, [autoStakeFlow, bridgeStakeState]);

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
  const statusResumeActionLabel = isStatusExitCollateralResume
    ? "Continue Bridge"
    : isStatusExitGunitResume
      ? "Continue Redeem & Bridge"
      : null;
  const redeemActionLabel = isPredepositRedeem
    ? (statusResumeActionLabel ?? "Withdraw, Redeem & Bridge")
    : isCitreaReturnFlow
      ? isOnMainnet
        ? "Redeem"
        : "Bridge"
      : "Redeem";

  const buttonState = useMemo(() => {
    const actionLabel = isDepositFlow ? depositButtonLabel : redeemActionLabel;

    if (isStatusDepositsPaused) {
      return { label: STATUS_DEPOSITS_PAUSED_LABEL, disabled: true };
    }

    if (!accountAddress) {
      return { label: "Connect wallet", disabled: true };
    }

    if (isPredepositRedeem && pendingCctpRecord) {
      if (txStep === "submitting") {
        return { label: "Minting USDC…", disabled: true };
      }

      if (pendingCctpRecord.status === "submitted") {
        return { label: "Waiting for Circle attestation…", disabled: true };
      }

      if (activeChainId !== LINEA_CHAIN_ID) {
        return { label: `Switch to ${LINEA_CHAIN_LABEL}`, disabled: false };
      }

      return { label: "Mint USDC on Linea", disabled: false };
    }

    if (isCitreaReturnFlow && isOnMainnet && !citreaReturnReadyForRedeem) {
      if (citreaReturnPending) {
        return { label: "Waiting for bridge…", disabled: true };
      }
      if (citreaReturnFinal) {
        return { label: "Bridge failed", disabled: true };
      }
      return { label: "Switch to Citrea", disabled: !switchChainAsync };
    }

    if (isDepositFlow && isCitreaDeposit && isAutoStakeFlowInProgress) {
      return { label: "Bridge in progress…", disabled: true };
    }

    if (isPredepositRedeem) {
      if (statusExitProgress && !isStatusExitProgressSelectionReady) {
        return { label: "Preparing recovery…", disabled: true };
      }

      if (
        !statusExitProgress?.bridgeRecipient &&
        !isCustomLineaRecipientValid
      ) {
        return { label: "Invalid Linea recipient", disabled: true };
      }

      if (!(statusExitProgress?.bridgeRecipient ?? lineaRecipient)) {
        return { label: "Linea recipient unavailable", disabled: true };
      }

      if (isStatusExitGunitResume) {
        if (
          statusExitProgressShares == null ||
          statusExitProgressShares <= ZERO_AMOUNT
        ) {
          return { label: "Stored GUnits unavailable", disabled: true };
        }
      } else if (isStatusExitCollateralResume) {
        if (
          statusExitProgressCollateralAmount == null ||
          statusExitProgressCollateralAmount <= ZERO_AMOUNT
        ) {
          return { label: "Collateral unavailable", disabled: true };
        }
      } else if (isStatusPredepositLoading) {
        return { label: "Checking predeposit…", disabled: true };
      } else if (isStatusPredepositError || statusPredepositAmount == null) {
        return { label: "Predeposit unavailable", disabled: true };
      } else if (statusPredepositAmount <= ZERO_AMOUNT) {
        if (pendingLineaNativeBridgeRecord) {
          return { label: "USDT bridge pending claim", disabled: true };
        }

        return { label: "No Status predeposit", disabled: true };
      }
    }

    if (shouldSwitchChain) {
      return {
        label: `Switch to ${requiredChainLabel}`,
        disabled: !switchChainAsync,
      };
    }

    if (isCitreaDeposit && isCitreaNativeBalancePending) {
      return { label: "Checking Citrea gas…", disabled: true };
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
      if (selectableStablecoins.length === 0) {
        return { label: "No redeem asset available", disabled: true };
      }

      if (!isGunitRedeem && !isPredepositRedeem && !gusdAddress) {
        return { label: "GUSD unavailable", disabled: true };
      }

      if (!isCitreaReturnFlow || isOnMainnet) {
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

    if (!isDepositFlow && shouldUseVaultPreview) {
      if (isRedeemQuotePending) {
        return { label: "Preparing redeem quote…", disabled: true };
      }

      if (isRedeemQuoteUnavailable) {
        return { label: "Redeem quote unavailable", disabled: true };
      }
    }

    if (!isDepositFlow && shouldGuardRedeemLiquidity) {
      if (redeemLiquidityState.phase === "loading") {
        return { label: "Checking liquidity…", disabled: true };
      }

      if (redeemLiquidityState.phase === "unavailable") {
        return { label: "Liquidity unavailable", disabled: true };
      }

      if (redeemLiquidityState.phase === "insufficient") {
        return {
          label: `Insufficient ${selectedTicker} liquidity`,
          disabled: true,
        };
      }
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
    activeChainId,
    citreaReturnFinal,
    citreaReturnPending,
    citreaReturnReadyForRedeem,
    depositButtonLabel,
    depositorAddress,
    gusdAddress,
    genericUnitTokenAddress,
    isCitreaNativeBalancePending,
    isCitreaDeposit,
    isCitreaReturnFlow,
    isDepositFlow,
    isAutoStakeFlowInProgress,
    isGunitRedeem,
    isCustomLineaRecipientValid,
    isOnMainnet,
    isNonMainnetDeposit,
    isPredepositRedeem,
    isRedeemQuotePending,
    isRedeemQuoteUnavailable,
    isStatusExitCollateralResume,
    isStatusExitGunitResume,
    isStatusExitProgressSelectionReady,
    isStatusDepositsPaused,
    isStatusPredepositError,
    isStatusPredepositLoading,
    lineaRecipient,
    selectableStablecoins.length,
    needsApproval,
    pendingCctpRecord,
    pendingLineaNativeBridgeRecord,
    parsedAmount,
    redeemLiquidityState.phase,
    redeemActionLabel,
    requiredChainLabel,
    selectedTicker,
    shouldGuardRedeemLiquidity,
    shouldUseVaultPreview,
    shouldSwitchChain,
    stablecoinAddress,
    statusExitProgress,
    statusExitProgressCollateralAmount,
    statusExitProgressShares,
    statusPredepositAmount,
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

    if (bridgeStakeState === "staking") {
      return { label: "Staking…", disabled: true };
    }

    if (!stakeTargetAmount || stakeTargetAmount <= ZERO_AMOUNT) {
      return { label: "Enter amount", disabled: true };
    }

    if (stakeInsufficientBalance) {
      return { label: "Insufficient balance", disabled: true };
    }

    if (shouldBlockStakeForBridge) {
      return {
        label: isBridgeToCitreaPending
          ? "Waiting for bridge…"
          : "Bridge to stake",
        disabled: true,
      };
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
    isBridgeToCitreaPending,
    needsStakeApproval,
    shouldBlockStakeForBridge,
    stakeInsufficientBalance,
    stakeTargetAmount,
    switchChainAsync,
  ]);

  const unstakeButtonState = useMemo(() => {
    if (!accountAddress) {
      return { label: "Connect wallet", disabled: true };
    }

    if (unstakeStep === "submitting") {
      return { label: "Unstaking…", disabled: true };
    }

    if (activeChainId !== CITREA_CHAIN_ID_NUMBER) {
      return { label: "Switch to Citrea", disabled: !switchChainAsync };
    }

    if (!unstakeParsedAmount || unstakeParsedAmount <= ZERO_AMOUNT) {
      return { label: "Enter amount", disabled: true };
    }

    if (unstakeInsufficientBalance) {
      return { label: "Insufficient balance", disabled: true };
    }

    return { label: "Unstake", disabled: false };
  }, [
    accountAddress,
    activeChainId,
    switchChainAsync,
    unstakeInsufficientBalance,
    unstakeParsedAmount,
    unstakeStep,
  ]);

  const stakeInputDisabled =
    isStakeMode &&
    (bridgeStakeState === "bridging" ||
      bridgeStakeState === "waiting" ||
      bridgeStakeState === "ready" ||
      bridgeStakeState === "staking");

  const activeStakeButtonState = isStakeMode
    ? stakeButtonState
    : unstakeButtonState;
  const stakePanelLabel = isStakeMode ? "Stake" : "Unstake";
  const stakePanelPlaceholder = isStakeMode
    ? "Amount in GUSD"
    : "Amount in sGUSD";
  const stakePanelValue = isStakeMode ? stakeAmount : unstakeAmount;
  const stakePanelInputDisabled = isStakeMode
    ? stakeInputDisabled
    : unstakeStep === "submitting";
  const stakePanelBalanceText = isStakeMode
    ? stakeBalanceText
    : unstakeBalanceText;
  const stakePanelCanUseMax = isStakeMode
    ? canUseStakeMax && !stakeInputDisabled
    : canUseUnstakeMax;
  const stakePanelOnMax = isStakeMode
    ? handleStakeMaxClick
    : handleUnstakeMaxClick;
  const stakePanelPreviewLabel = isStakeMode
    ? "Est. vault shares"
    : "Est. GUSD";
  const stakePanelPreviewValue = isStakeMode
    ? stakePreviewText
    : unstakePreviewText;

  const refetchRedeemBalances = useCallback(async () => {
    const balanceRefetches: Promise<unknown>[] = [];

    if (stablecoinBalance.refetch) {
      balanceRefetches.push(stablecoinBalance.refetch());
    }
    if (gusdBalance.refetch) {
      balanceRefetches.push(gusdBalance.refetch());
    }
    if (genericUnitBalance.refetch) {
      balanceRefetches.push(genericUnitBalance.refetch());
    }

    if (balanceRefetches.length) {
      await Promise.allSettled(balanceRefetches);
    }
  }, [
    genericUnitBalance.refetch,
    gusdBalance.refetch,
    stablecoinBalance.refetch,
  ]);

  const ensureRedeemVaultLiquidity = useCallback(
    async ({
      redeemShares,
      requestedAssets,
      postUnwrap = false,
    }: {
      redeemShares?: bigint;
      requestedAssets?: bigint | null;
      postUnwrap?: boolean;
    }) => {
      const redeemClient = mainnetClient ?? publicClient;

      if (!redeemClient || !vaultAddress) {
        return false;
      }

      const canCheckAccountLimits = Boolean(
        accountAddress && redeemShares != null,
      );
      const [
        availableAssets,
        maxWithdrawAssets,
        maxRedeemShares,
        previewAssetsFromShares,
      ] = await Promise.all([
        redeemClient.readContract({
          abi: erc4626Abi,
          address: vaultAddress,
          functionName: "totalAssets",
        }) as Promise<bigint>,
        canCheckAccountLimits
          ? (redeemClient.readContract({
              abi: erc4626Abi,
              address: vaultAddress,
              functionName: "maxWithdraw",
              args: [accountAddress as HexAddress],
            }) as Promise<bigint>)
          : Promise.resolve<bigint | null>(null),
        canCheckAccountLimits
          ? (redeemClient.readContract({
              abi: erc4626Abi,
              address: vaultAddress,
              functionName: "maxRedeem",
              args: [accountAddress as HexAddress],
            }) as Promise<bigint>)
          : Promise.resolve<bigint | null>(null),
        redeemShares != null
          ? (redeemClient.readContract({
              abi: erc4626Abi,
              address: vaultAddress,
              functionName: "previewRedeem",
              args: [redeemShares],
            }) as Promise<bigint>)
          : Promise.resolve<bigint | null>(null),
      ]);
      const requiredAssets =
        requestedAssets != null ? requestedAssets : previewAssetsFromShares;

      if (requiredAssets == null || requiredAssets <= ZERO_AMOUNT) {
        setTxError(REDEEM_QUOTE_UNAVAILABLE_MESSAGE);
        pushAlert({
          type: "warning",
          title: "Redeem quote unavailable",
          message: REDEEM_QUOTE_UNAVAILABLE_MESSAGE,
        });
        return false;
      }

      const effectiveAvailableAssets =
        maxWithdrawAssets != null && maxWithdrawAssets < availableAssets
          ? maxWithdrawAssets
          : availableAssets;
      const exceedsAccountRedeemLimit =
        redeemShares != null &&
        maxRedeemShares != null &&
        redeemShares > maxRedeemShares;

      if (
        requiredAssets <= effectiveAvailableAssets &&
        !exceedsAccountRedeemLimit
      ) {
        return true;
      }

      const message = postUnwrap
        ? buildPostUnwrapLiquidityMessage({ ticker: selectedTicker })
        : buildSelectedVaultLiquidityMessage({
            ticker: selectedTicker,
            availableAssets: effectiveAvailableAssets,
            decimals: stablecoinDecimals,
          });

      setTxError(message);
      redeemVaultLiquidity.refresh();
      await refetchRedeemBalances();
      pushAlert({
        type: "warning",
        title: "Redeem unavailable in selected asset",
        message,
      });
      return false;
    },
    [
      accountAddress,
      mainnetClient,
      publicClient,
      vaultAddress,
      selectedTicker,
      stablecoinDecimals,
      redeemVaultLiquidity.refresh,
      refetchRedeemBalances,
    ],
  );

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
    if (isStatusDepositsPaused) {
      return;
    }
    if (isCitreaDeposit && isCitreaNativeBalancePending) {
      return;
    }
    if (isCitreaDeposit && isAutoStakeFlowInProgress) {
      return;
    }

    setTxError(null);
    setPostMintHref(null);

    const routeAtSubmit = depositRoute;

    try {
      let toastMessage: ReactNode | undefined;
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
          const requestedAmount =
            stakeParsedAmount && stakeParsedAmount > ZERO_AMOUNT
              ? stakeParsedAmount
              : null;
          setPendingStakeAmount(null);
          setBridgeStakeState("bridging");
          setStakeError(null);
          setAutoStakeFlow({
            active: true,
            baselineBalance: stakeBalanceValue ?? ZERO_AMOUNT,
            startedAt: Date.now(),
            requestedAmount,
            arrivedAmount: null,
          });
          setAutoSwitchRequested(false);
        }
        const remoteRecipient = toBytes32(accountAddress);
        const bridgeParams = shouldUseCitreaNativeDrop
          ? buildCitreaBridgeParams(remoteRecipient)
          : CITREA_BRIDGE_PARAMS;
        const sender = toBytes32(accountAddress);
        const sourceWhitelabel = toBytes32(l1GusdAddress as HexBytes);
        const destinationWhitelabel = CITREA_WHITELABEL;
        const nativeFee = await estimateLzBridgeFee({
          client: mainnetClient,
          bridgeCoordinatorAddress: BRIDGE_COORDINATOR_L1_ADDRESS,
          adapterAddress: LZ_ADAPTER_L1_ADDRESS,
          destinationChainId: CITREA_CHAIN_ID,
          bridgeParams,
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
            bridgeParams,
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
            bridgeParams,
          ],
          value: nativeFee,
        });
        toastMessage = buildLayerZeroMessage(depositHash);
        if (ENABLE_LZ_LOGS) {
          console.info("LZ track: L1→Citrea tx stored", {
            txHash: depositHash,
            account: accountAddress,
            amount: parsedAmount.toString(),
          });
        }
        if (stakeAfterBridge) {
          setAutoStakeFlow((current) =>
            current
              ? {
                  ...current,
                  sourceTxHash: depositHash,
                }
              : current,
          );
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
          bridgeParams,
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
      notifyTxSubmitted(depositActionLabel, depositHash, toastMessage);
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      notifyTxConfirmed(depositActionLabel, depositHash, toastMessage);
      if (isCitreaDeposit && stakeAfterBridge) {
        // TODO: replace balance polling with LayerZero message status tracking.
        setBridgeStakeState("waiting");
      }

      if (isCitreaDeposit) {
        setStakeAfterBridge(true);
        setStakeMode("stake");
      }

      const opportunityHref = getOpportunityHref(routeAtSubmit);
      if (opportunityHref && routeAtSubmit !== "citrea") {
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
        setAutoStakeFlow((current) =>
          current
            ? {
                ...current,
                active: false,
              }
            : current,
        );
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
      const toastMessage = buildLayerZeroMessage(bridgeHash);
      notifyTxSubmitted("Bridge", bridgeHash, toastMessage);
      await publicClient.waitForTransactionReceipt({ hash: bridgeHash });
      notifyTxConfirmed("Bridge", bridgeHash, toastMessage);

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

        setBridgeStakeState("idle");
        setPendingStakeAmount(null);
        setAutoStakeFlow(null);
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
        setAutoStakeFlow((current) =>
          current
            ? {
                ...current,
                active: false,
              }
            : current,
        );
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
    if (
      !accountAddress ||
      !vaultAddress ||
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
      let redeemShares = parsedAmount;

      if (isGunitRedeem) {
        const hasLiquidity = await ensureRedeemVaultLiquidity({
          redeemShares,
        });

        if (!hasLiquidity) {
          return;
        }
      } else {
        if (previewToAmountRaw == null) {
          setTxError(REDEEM_QUOTE_UNAVAILABLE_MESSAGE);
          pushAlert({
            type: "warning",
            title: "Redeem quote unavailable",
            message: REDEEM_QUOTE_UNAVAILABLE_MESSAGE,
          });
          return;
        }

        const hasLiquidity = await ensureRedeemVaultLiquidity({
          requestedAssets: previewToAmountRaw,
        });

        if (!hasLiquidity) {
          return;
        }
      }

      if (!isGunitRedeem) {
        if (!gusdAddress) {
          return;
        }

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
        redeemShares = balanceAfter - balanceBefore;
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

        const hasLiquidityAfterUnwrap = await ensureRedeemVaultLiquidity({
          redeemShares,
          postUnwrap: true,
        });

        if (!hasLiquidityAfterUnwrap) {
          return;
        }
      }

      const hasLiquidityBeforeApproval = await ensureRedeemVaultLiquidity({
        redeemShares,
        postUnwrap: !isGunitRedeem,
      });

      if (!hasLiquidityBeforeApproval) {
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

      const hasLiquidityBeforeRedeem = await ensureRedeemVaultLiquidity({
        redeemShares,
        postUnwrap: !isGunitRedeem,
      });

      if (!hasLiquidityBeforeRedeem) {
        return;
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
      redeemVaultLiquidity.refresh();
      await refetchRedeemBalances();
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

  const handleMintCctpOnLinea = async () => {
    if (!pendingCctpRecord || !accountAddress) {
      return;
    }

    if (!pendingCctpAttestationReady) {
      return;
    }

    if (activeChainId !== LINEA_CHAIN_ID) {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: LINEA_CHAIN_ID });
      }
      return;
    }

    if (
      !publicClient ||
      !pendingCctpRecord.message ||
      !pendingCctpRecord.attestation
    ) {
      return;
    }

    setTxError(null);
    setTxStep("submitting");

    try {
      console.info("CCTP receive call", {
        functionName: "receiveMessage",
        address: CCTP_MESSAGE_TRANSMITTER_V2_ADDRESS,
        chainId: LINEA_CHAIN_ID,
        txHash: pendingCctpRecord.txHash,
      });
      const mintHash = await writeContractAsync({
        abi: cctpMessageTransmitterV2Abi,
        address: CCTP_MESSAGE_TRANSMITTER_V2_ADDRESS,
        chainId: LINEA_CHAIN_ID,
        functionName: "receiveMessage",
        args: [pendingCctpRecord.message, pendingCctpRecord.attestation],
      });
      notifyTxSubmitted("Linea mint", mintHash);
      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      notifyTxConfirmed("Linea mint", mintHash);

      setCctpBridgeRecords((current) =>
        current.map((record) =>
          record.txHash.toLowerCase() === pendingCctpRecord.txHash.toLowerCase()
            ? {
                ...record,
                status: "minted",
                updatedAt: Date.now(),
                finalizedAt: Date.now(),
              }
            : record,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Linea mint failed";
      setTxError(message);
      pushAlert({
        type: "error",
        title: "Linea mint failed",
        message,
      });
    } finally {
      setTxStep("idle");
    }
  };

  const handleStatusExit = async () => {
    const progress = statusExitProgress;
    const exitTicker = progress?.ticker ?? selectedTicker;
    const exitVaultAddress = progress?.vaultAddress ?? vaultAddress;
    const exitGenericUnitTokenAddress =
      progress?.genericUnitTokenAddress ?? genericUnitTokenAddress;
    const exitStablecoinAddress =
      progress?.stablecoinAddress ?? stablecoinAddress;
    const exitBridgeRequested = true;
    const recipient = progress?.bridgeRecipient ?? lineaRecipient;
    const progressCreatedAt = progress?.createdAt ?? Date.now();

    if (
      !accountAddress ||
      !exitVaultAddress ||
      !exitGenericUnitTokenAddress ||
      !exitStablecoinAddress ||
      !statusPredepositChainNickname ||
      !publicClient
    ) {
      return;
    }

    if (!isStatusExitProgressSelectionReady) {
      return;
    }

    if (exitBridgeRequested && !recipient) {
      return;
    }

    if (!progress) {
      if (
        !isCustomLineaRecipientValid ||
        statusPredepositAmount == null ||
        statusPredepositAmount <= ZERO_AMOUNT
      ) {
        return;
      }
    }

    if (
      progress?.stage === "gunit" &&
      (statusExitProgressShares == null ||
        statusExitProgressShares <= ZERO_AMOUNT)
    ) {
      return;
    }

    if (
      progress?.stage === "collateral" &&
      (statusExitProgressCollateralAmount == null ||
        statusExitProgressCollateralAmount <= ZERO_AMOUNT)
    ) {
      return;
    }

    const statusClient = mainnetClient ?? publicClient;
    const writeProgress = (
      record: Omit<
        StatusExitProgressRecord,
        "account" | "createdAt" | "updatedAt"
      >,
    ) => {
      const now = Date.now();
      setStatusExitProgressRecords((current) =>
        upsertStatusExitProgressRecord(current, {
          ...record,
          account: accountAddress,
          createdAt: progressCreatedAt,
          updatedAt: now,
        }),
      );
    };
    const clearProgress = () => {
      setStatusExitProgressRecords((current) =>
        clearStatusExitProgressRecord(current, accountAddress),
      );
    };
    const writeGunitProgress = (shares: bigint) => {
      writeProgress({
        stage: "gunit",
        ticker: exitTicker,
        chainNickname: statusPredepositChainNickname,
        remoteRecipient: progress?.remoteRecipient ?? predepositRecipient,
        genericUnitTokenAddress: exitGenericUnitTokenAddress,
        stablecoinAddress: exitStablecoinAddress,
        vaultAddress: exitVaultAddress,
        bridgeRequested: exitBridgeRequested,
        bridgeRecipient: exitBridgeRequested ? recipient : undefined,
        shares: shares.toString(),
      });
    };
    const writeCollateralProgress = (amount: bigint) => {
      writeProgress({
        stage: "collateral",
        ticker: exitTicker,
        chainNickname: statusPredepositChainNickname,
        remoteRecipient: progress?.remoteRecipient ?? predepositRecipient,
        genericUnitTokenAddress: exitGenericUnitTokenAddress,
        stablecoinAddress: exitStablecoinAddress,
        vaultAddress: exitVaultAddress,
        bridgeRequested: exitBridgeRequested,
        bridgeRecipient: exitBridgeRequested ? recipient : undefined,
        collateralAmount: amount.toString(),
      });
    };
    const refetchStatusExitBalances = async () => {
      redeemVaultLiquidity.refresh();
      const refetches: Promise<unknown>[] = [];
      if (refetchStatusPredeposit) {
        refetches.push(refetchStatusPredeposit());
      }
      if (stablecoinBalance.refetch) {
        refetches.push(stablecoinBalance.refetch());
      }
      if (genericUnitBalance.refetch) {
        refetches.push(genericUnitBalance.refetch());
      }
      if (refetches.length) {
        await Promise.allSettled(refetches);
      }
    };

    setTxError(null);
    setPostMintHref(null);

    try {
      let redeemShares =
        progress?.stage === "gunit" ? statusExitProgressShares : null;
      let redeemedAmount =
        progress?.stage === "collateral"
          ? statusExitProgressCollateralAmount
          : null;

      if (!progress) {
        const unitBalanceBefore = await statusClient.readContract({
          abi: erc20Abi,
          address: exitGenericUnitTokenAddress,
          functionName: "balanceOf",
          args: [accountAddress],
        });

        setTxStep("submitting");
        console.info("Status predeposit withdrawal call", {
          functionName: "withdrawPredeposit",
          address: BRIDGE_COORDINATOR_L1_ADDRESS,
          chainId: MAINNET_CHAIN_ID,
          args: [
            statusPredepositChainNickname,
            predepositRecipient,
            accountAddress,
            ZERO_ADDRESS,
          ],
        });
        const withdrawHash = await writeContractAsync({
          abi: bridgeCoordinatorPredepositAbi,
          address: BRIDGE_COORDINATOR_L1_ADDRESS,
          chainId: MAINNET_CHAIN_ID,
          functionName: "withdrawPredeposit",
          args: [
            statusPredepositChainNickname,
            predepositRecipient,
            accountAddress,
            ZERO_ADDRESS,
          ],
        });
        notifyTxSubmitted("Status withdrawal", withdrawHash);
        await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
        notifyTxConfirmed("Status withdrawal", withdrawHash);

        const unitBalanceAfter = await statusClient.readContract({
          abi: erc20Abi,
          address: exitGenericUnitTokenAddress,
          functionName: "balanceOf",
          args: [accountAddress],
        });
        redeemShares = unitBalanceAfter - unitBalanceBefore;

        if (redeemShares <= ZERO_AMOUNT) {
          setTxError("No GenericUnit tokens were withdrawn.");
          pushAlert({
            type: "warning",
            title: "Withdrawal unavailable",
            message: "No GenericUnit tokens were withdrawn.",
          });
          return;
        }

        writeGunitProgress(redeemShares);
      }

      if (redeemedAmount == null) {
        if (redeemShares == null || redeemShares <= ZERO_AMOUNT) {
          setTxError("No GenericUnit tokens are available to redeem.");
          pushAlert({
            type: "warning",
            title: "Redeem unavailable",
            message: "No GenericUnit tokens are available to redeem.",
          });
          return;
        }

        const hasLiquidityBeforeApproval = await ensureRedeemVaultLiquidity({
          redeemShares,
        });

        if (!hasLiquidityBeforeApproval) {
          return;
        }

        const currentAllowance = await statusClient.readContract({
          abi: erc20Abi,
          address: exitGenericUnitTokenAddress,
          functionName: "allowance",
          args: [accountAddress, exitVaultAddress],
        });

        if (currentAllowance < redeemShares) {
          setTxStep("approving");
          console.info("Status redeem approval call", {
            functionName: "approve",
            address: exitGenericUnitTokenAddress,
            chainId: MAINNET_CHAIN_ID,
            args: [exitVaultAddress, redeemShares],
          });
          const approvalHash = await writeContractAsync({
            abi: erc20Abi,
            address: exitGenericUnitTokenAddress,
            chainId: MAINNET_CHAIN_ID,
            functionName: "approve",
            args: [exitVaultAddress, redeemShares],
          });
          notifyTxSubmitted("Approval", approvalHash);
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          notifyTxConfirmed("Approval", approvalHash);
          await refetchRedeemAllowance?.();
        }

        const hasLiquidityBeforeRedeem = await ensureRedeemVaultLiquidity({
          redeemShares,
        });

        if (!hasLiquidityBeforeRedeem) {
          return;
        }

        const stablecoinBalanceBefore = await statusClient.readContract({
          abi: erc20Abi,
          address: exitStablecoinAddress,
          functionName: "balanceOf",
          args: [accountAddress],
        });

        setTxStep("submitting");
        console.info("Status redeem call", {
          functionName: "redeem",
          address: exitVaultAddress,
          chainId: MAINNET_CHAIN_ID,
          args: [redeemShares, accountAddress, accountAddress],
        });
        const redeemHash = await writeContractAsync({
          abi: erc4626Abi,
          address: exitVaultAddress,
          chainId: MAINNET_CHAIN_ID,
          functionName: "redeem",
          args: [redeemShares, accountAddress, accountAddress],
        });
        notifyTxSubmitted("Redeem", redeemHash);
        await publicClient.waitForTransactionReceipt({ hash: redeemHash });
        notifyTxConfirmed("Redeem", redeemHash);

        const stablecoinBalanceAfter = await statusClient.readContract({
          abi: erc20Abi,
          address: exitStablecoinAddress,
          functionName: "balanceOf",
          args: [accountAddress],
        });
        redeemedAmount = stablecoinBalanceAfter - stablecoinBalanceBefore;

        if (redeemedAmount <= ZERO_AMOUNT) {
          setTxError(`No ${exitTicker} was redeemed.`);
          pushAlert({
            type: "warning",
            title: "Redeem unavailable",
            message: `No ${exitTicker} was redeemed.`,
          });
          return;
        }

        if (!exitBridgeRequested) {
          clearProgress();
          setFromAmount("");
          await refetchStatusExitBalances();
          return;
        }

        writeCollateralProgress(redeemedAmount);
      }

      if (!exitBridgeRequested) {
        clearProgress();
        setFromAmount("");
        await refetchStatusExitBalances();
        return;
      }

      if (
        !recipient ||
        redeemedAmount == null ||
        redeemedAmount <= ZERO_AMOUNT
      ) {
        return;
      }

      const bridgeBalance = await statusClient.readContract({
        abi: erc20Abi,
        address: exitStablecoinAddress,
        functionName: "balanceOf",
        args: [accountAddress],
      });

      if (bridgeBalance < redeemedAmount) {
        setTxError(`Insufficient ${exitTicker} balance to continue bridge.`);
        pushAlert({
          type: "warning",
          title: "Bridge unavailable",
          message: `Your ${exitTicker} balance is lower than the stored bridge amount.`,
        });
        return;
      }

      if (exitTicker === "USDC") {
        const bridgeAllowance = await statusClient.readContract({
          abi: erc20Abi,
          address: exitStablecoinAddress,
          functionName: "allowance",
          args: [accountAddress, CCTP_TOKEN_MESSENGER_V2_ADDRESS],
        });

        if (bridgeAllowance < redeemedAmount) {
          setTxStep("approving");
          console.info("CCTP USDC approval call", {
            functionName: "approve",
            address: exitStablecoinAddress,
            chainId: MAINNET_CHAIN_ID,
            args: [CCTP_TOKEN_MESSENGER_V2_ADDRESS, redeemedAmount],
          });
          const approvalHash = await writeContractAsync({
            abi: erc20Abi,
            address: exitStablecoinAddress,
            chainId: MAINNET_CHAIN_ID,
            functionName: "approve",
            args: [CCTP_TOKEN_MESSENGER_V2_ADDRESS, redeemedAmount],
          });
          notifyTxSubmitted("Bridge approval", approvalHash);
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          notifyTxConfirmed("Bridge approval", approvalHash);
        }

        const cctpMaxFee = ZERO_AMOUNT;
        const mintRecipient = toBytes32(recipient);

        setTxStep("submitting");
        console.info("CCTP depositForBurn call", {
          functionName: "depositForBurn",
          address: CCTP_TOKEN_MESSENGER_V2_ADDRESS,
          chainId: MAINNET_CHAIN_ID,
          args: [
            redeemedAmount,
            CCTP_LINEA_DOMAIN,
            mintRecipient,
            exitStablecoinAddress,
            ZERO_BYTES32,
            cctpMaxFee,
            CCTP_STANDARD_FINALITY_THRESHOLD,
          ],
        });
        const burnHash = await writeContractAsync({
          abi: cctpTokenMessengerV2Abi,
          address: CCTP_TOKEN_MESSENGER_V2_ADDRESS,
          chainId: MAINNET_CHAIN_ID,
          functionName: "depositForBurn",
          args: [
            redeemedAmount,
            CCTP_LINEA_DOMAIN,
            mintRecipient,
            exitStablecoinAddress,
            ZERO_BYTES32,
            cctpMaxFee,
            CCTP_STANDARD_FINALITY_THRESHOLD,
          ],
        });
        notifyTxSubmitted("USDC burn", burnHash);
        await publicClient.waitForTransactionReceipt({ hash: burnHash });
        notifyTxConfirmed("USDC burn", burnHash);

        const now = Date.now();
        setCctpBridgeRecords((current) =>
          upsertCctpBridgeRecord(current, {
            txHash: burnHash,
            account: accountAddress,
            amount: redeemedAmount.toString(),
            recipient,
            sourceDomain: CCTP_ETHEREUM_DOMAIN,
            destinationDomain: CCTP_LINEA_DOMAIN,
            status: "submitted",
            createdAt: now,
            updatedAt: now,
          }),
        );
        clearProgress();
      } else if (exitTicker === "USDT") {
        const bridgeAllowance = await statusClient.readContract({
          abi: erc20Abi,
          address: exitStablecoinAddress,
          functionName: "allowance",
          args: [accountAddress, LINEA_TOKEN_BRIDGE_ADDRESS],
        });

        if (bridgeAllowance < redeemedAmount) {
          setTxStep("approving");
          if (bridgeAllowance > ZERO_AMOUNT) {
            const resetHash = await writeContractAsync({
              abi: erc20Abi,
              address: exitStablecoinAddress,
              chainId: MAINNET_CHAIN_ID,
              functionName: "approve",
              args: [LINEA_TOKEN_BRIDGE_ADDRESS, ZERO_AMOUNT],
            });
            notifyTxSubmitted("Bridge approval reset", resetHash);
            await publicClient.waitForTransactionReceipt({ hash: resetHash });
            notifyTxConfirmed("Bridge approval reset", resetHash);
          }

          console.info("Linea USDT approval call", {
            functionName: "approve",
            address: exitStablecoinAddress,
            chainId: MAINNET_CHAIN_ID,
            args: [LINEA_TOKEN_BRIDGE_ADDRESS, redeemedAmount],
          });
          const approvalHash = await writeContractAsync({
            abi: erc20Abi,
            address: exitStablecoinAddress,
            chainId: MAINNET_CHAIN_ID,
            functionName: "approve",
            args: [LINEA_TOKEN_BRIDGE_ADDRESS, redeemedAmount],
          });
          notifyTxSubmitted("Bridge approval", approvalHash);
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          notifyTxConfirmed("Bridge approval", approvalHash);
        }

        setTxStep("submitting");
        const bridgeFee = await readLineaTokenBridgeFee(statusClient);
        console.info("Linea TokenBridge call", {
          functionName: "bridgeToken",
          address: LINEA_TOKEN_BRIDGE_ADDRESS,
          chainId: MAINNET_CHAIN_ID,
          args: [exitStablecoinAddress, redeemedAmount, recipient],
          value: bridgeFee,
        });
        const bridgeHash = await writeContractAsync({
          abi: lineaTokenBridgeAbi,
          address: LINEA_TOKEN_BRIDGE_ADDRESS,
          chainId: MAINNET_CHAIN_ID,
          functionName: "bridgeToken",
          args: [exitStablecoinAddress, redeemedAmount, recipient],
          value: bridgeFee,
        });
        notifyTxSubmitted("Linea bridge", bridgeHash);
        await publicClient.waitForTransactionReceipt({ hash: bridgeHash });
        const now = Date.now();
        setLineaNativeBridgeRecords((current) =>
          upsertLineaNativeBridgeRecord(current, {
            txHash: bridgeHash,
            account: accountAddress,
            token: exitStablecoinAddress,
            ticker: exitTicker,
            amount: redeemedAmount.toString(),
            recipient,
            status: "submitted",
            createdAt: now,
            updatedAt: now,
          }),
        );
        pushAlert({
          type: "info",
          title: "Linea bridge pending claim",
          message: buildLineaNativeBridgeMessage(bridgeHash),
          duration: 12_000,
        });
        clearProgress();
      }

      setFromAmount("");
      await refetchStatusExitBalances();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Status withdrawal failed";
      setTxError(message);
      pushAlert({
        type: "error",
        title: "Status withdrawal failed",
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

    if (isStatusDepositsPaused) {
      return;
    }

    if (isPredepositRedeem && pendingCctpRecord) {
      await handleMintCctpOnLinea();
      return;
    }

    if (isDepositFlow && isCitreaDeposit && isAutoStakeFlowInProgress) {
      return;
    }

    if (isCitreaReturnFlow && isOnMainnet && !citreaReturnReadyForRedeem) {
      if (!citreaReturnPending && !citreaReturnFinal && switchChainAsync) {
        await switchChainAsync({ chainId: CITREA_CHAIN_ID_NUMBER });
      }
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

    if (
      !isDepositFlow &&
      shouldUseVaultPreview &&
      (isRedeemQuotePending || isRedeemQuoteUnavailable)
    ) {
      return;
    }

    if (
      !isDepositFlow &&
      shouldGuardRedeemLiquidity &&
      (redeemLiquidityState.phase === "loading" ||
        redeemLiquidityState.phase === "insufficient" ||
        redeemLiquidityState.phase === "unavailable")
    ) {
      return;
    }

    if (isDepositFlow) {
      await handleDeposit();
      return;
    }

    if (isPredepositRedeem) {
      await handleStatusExit();
      return;
    }

    if (isCitreaReturnFlow) {
      if (isOnMainnet) {
        if (!citreaReturnReadyForRedeem) {
          return;
        }
        await handleRedeem();
      } else {
        await handleCitreaReturn();
      }
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

  const handleUnstakeAction = async () => {
    if (!accountAddress) {
      return;
    }

    if (!publicClient) {
      return;
    }

    if (activeChainId !== CITREA_CHAIN_ID_NUMBER) {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: CITREA_CHAIN_ID_NUMBER });
      }
      return;
    }

    if (
      !unstakeParsedAmount ||
      unstakeParsedAmount <= ZERO_AMOUNT ||
      unstakeInsufficientBalance
    ) {
      return;
    }

    setUnstakeError(null);
    setUnstakeStep("submitting");

    try {
      console.info("Unstake redeem call", {
        functionName: "redeem",
        address: CITREA_VAULT_ADDRESS,
        chainId: activeChainId,
        args: [unstakeParsedAmount, accountAddress, accountAddress],
      });
      const redeemHash = await writeContractAsync({
        abi: erc4626Abi,
        address: CITREA_VAULT_ADDRESS,
        chainId: activeChainId,
        functionName: "redeem",
        args: [unstakeParsedAmount, accountAddress, accountAddress],
      });
      notifyTxSubmitted("Unstake", redeemHash);
      await publicClient.waitForTransactionReceipt({ hash: redeemHash });
      notifyTxConfirmed("Unstake", redeemHash);

      setUnstakeAmount("");
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
        error instanceof Error ? error.message : "Unstaking failed";
      setUnstakeError(message);
      pushAlert({
        type: "error",
        title: "Unstaking failed",
        message,
      });
    } finally {
      setUnstakeStep("idle");
    }
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
      ? isOnMainnet
        ? "Ethereum"
        : "Citrea"
      : "Ethereum";
  const toChainLabel = isPredepositRedeem
    ? LINEA_CHAIN_LABEL
    : isDepositFlow
      ? depositToChainLabel
      : "Ethereum";
  const fromAssetLabelOverride = isPredepositRedeem
    ? isStatusExitCollateralResume
      ? selectedTicker
      : isStatusExitGunitResume
        ? "GUnits"
        : "Status predeposit"
    : !isDepositFlow && isCitreaReturnFlow && fromAssetType === "gusd"
      ? isOnMainnet
        ? "GUSD"
        : "Citrea GUSD"
      : fromAssetType === "gunit"
        ? "GUnits"
        : undefined;

  const renderAssetSelector = (
    assetType: AssetType,
    labelOverride?: string,
  ) => {
    if (assetType === "stablecoin") {
      return (
        <Select
          value={selectedTicker}
          onValueChange={handleStablecoinChange}
          disabled={Boolean(statusExitProgress)}
        >
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
            {selectableStablecoins.map((coin) => (
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

    const defaultLabel = assetType === "gunit" ? "GUnits" : "GUSD";
    return (
      <div className="flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 text-sm font-medium text-foreground">
        <TokenIcon
          src={gusd.iconUrl}
          alt={assetType === "gunit" ? "GUnit icon" : "GUSD icon"}
        />
        <span>{labelOverride ?? defaultLabel}</span>
      </div>
    );
  };

  return (
    <div id="deposit" className="w-full px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="hidden -mt-20 space-y-4 text-center md:block">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Generic Money
          </span>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Fungible Onchain Native Dollar
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            Fully onchain, liquid, yield-generating, (soon) private
          </p>
        </div>
        <fieldset className="mt-2 space-y-4 md:mt-10">
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
              {showRedeemSourceSelector ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                  <div className="inline-flex w-full rounded-full border border-border/60 bg-background/80 p-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => handleRedeemSourceChange("gusd")}
                      aria-pressed={redeemSource === "gusd"}
                      disabled={txStep !== "idle"}
                      className={cn(
                        "flex-1 rounded-full px-3 py-1 transition",
                        redeemSource === "gusd"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Redeem from GUSD
                    </button>
                    {showGunitRedeemSourceOption ? (
                      <button
                        type="button"
                        onClick={() => handleRedeemSourceChange("gunit")}
                        aria-pressed={redeemSource === "gunit"}
                        disabled={txStep !== "idle"}
                        className={cn(
                          "flex-1 rounded-full px-3 py-1 transition",
                          redeemSource === "gunit"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Withdraw from GUnits
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col gap-4">
                <SwapAssetPanel
                  label="From"
                  chainLabel={fromChainLabel}
                  selector={renderAssetSelector(
                    fromAssetType,
                    fromAssetLabelOverride,
                  )}
                  inputProps={{
                    placeholder: fromPlaceholder,
                    autoComplete: "off",
                    disabled: isPredepositRedeem,
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
                {canSwitchDirection ? (
                  <button
                    type="button"
                    onClick={handleSwitchDirection}
                    aria-label="Switch direction"
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                ) : null}
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
              {isPredepositRedeem ? (
                <div className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Claim on Linea
                    </p>
                    <a
                      href={STATUS_LINEA_ANNOUNCEMENT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-xs font-medium text-foreground underline underline-offset-4"
                    >
                      Read the Status announcement
                    </a>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">
                        Recipient:
                      </span>{" "}
                      {useCustomLineaRecipient
                        ? "custom Linea address"
                        : "same address on Linea"}
                      {!useCustomLineaRecipient ? (
                        <span className="mt-1 block">
                          If this wallet is a multisig or contract, confirm it
                          exists and is controllable on Linea, or set a
                          different recipient.
                        </span>
                      ) : null}
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={useCustomLineaRecipient}
                        onChange={(event) =>
                          setUseCustomLineaRecipient(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      Set another Linea recipient
                    </label>
                    {useCustomLineaRecipient ? (
                      <input
                        type="text"
                        inputMode="text"
                        placeholder="0x..."
                        value={lineaRecipientInput}
                        onChange={(event) =>
                          setLineaRecipientInput(event.target.value)
                        }
                        className={cn(
                          "h-10 w-full rounded-xl border border-border/80 bg-muted/30 px-3 font-mono text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          !isCustomLineaRecipientValid &&
                            "border-destructive/60 focus:border-destructive/70",
                        )}
                      />
                    ) : null}
                    {useCustomLineaRecipient && !isCustomLineaRecipientValid ? (
                      <p className="text-xs text-destructive">
                        Enter a valid EVM address.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {isDepositFlow && depositRoute === "citrea" ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Stake
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stake Citrea GUSD when funds arrive.
                      </p>
                      <p className="mt-1 text-xs font-semibold text-foreground/80">
                        APY {OPPORTUNITY_APY_CAP.citrea}
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
                </div>
              ) : null}
              {shouldShowRedeemLiquidityNotice ? (
                <RedeemLiquidityNotice
                  state={redeemLiquidityState}
                  selectedTicker={selectedTicker}
                  onOpenDetails={() => setIsVaultAvailabilityDialogOpen(true)}
                />
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
              {isStatusDepositsPaused ? (
                <p className="text-center text-xs text-muted-foreground">
                  {STATUS_DEPOSITS_PAUSED_MESSAGE}
                </p>
              ) : null}
              {pendingBridgeForRoute ? (
                <p className="text-center text-xs text-muted-foreground">
                  Bridge in progress ·{" "}
                  {pendingBridgeStatusLabel.slice(0, 1).toUpperCase() +
                    pendingBridgeStatusLabel.slice(1)}
                </p>
              ) : null}
              {isPredepositRedeem && pendingCctpRecord ? (
                <p className="text-center text-xs text-muted-foreground">
                  {pendingCctpRecord.status === "submitted"
                    ? "USDC burn confirmed. Waiting for Circle attestation."
                    : activeChainId === LINEA_CHAIN_ID
                      ? "Attestation ready. Mint USDC on Linea to finish."
                      : "Attestation ready. Switch to Linea to mint USDC."}
                </p>
              ) : null}
              {isPredepositRedeem && statusExitProgress ? (
                <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-center text-xs text-muted-foreground">
                  {statusExitProgress.stage === "gunit"
                    ? `Status withdrawal confirmed. Continue redeeming the stored GUnits into ${statusExitProgress.ticker}.`
                    : `Status collateral redeemed. Continue bridging the stored ${statusExitProgress.ticker} amount to Linea.`}
                </div>
              ) : null}
              {isPredepositRedeem && pendingLineaNativeBridgeRecord ? (
                <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3 text-center text-xs text-muted-foreground">
                  <p>
                    {pendingLineaNativeBridgeRecord.ticker} bridge pending
                    destination claim. The Ethereum bridge transaction is
                    confirmed, but the Linea side may still need to be claimed
                    before funds arrive.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    <a
                      href={LINEA_BRIDGE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      Open Linea bridge
                    </a>
                    <a
                      href={LINEASCAN_L1_TO_L2_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      View LineaScan deposits
                    </a>
                  </div>
                </div>
              ) : null}
              {!pendingBridgeForRoute &&
              isCitreaReturnFlow &&
              citreaReturnFinal ? (
                <p className="text-center text-xs text-muted-foreground">
                  {citreaReturnDelivered
                    ? isOnMainnet
                      ? "Bridge complete — ready to redeem."
                      : "Bridge complete — switch to Ethereum to redeem."
                    : `Bridge ${citreaReturnStatusLabel
                        .replace(/^./, (char) => char.toUpperCase())
                        .trim()}.`}
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
              <VaultAvailabilityDialog
                open={isVaultAvailabilityDialogOpen}
                onOpenChange={setIsVaultAvailabilityDialogOpen}
                selectedTicker={selectedTicker}
                vaults={redeemLiquidityVaults}
                onSelectTicker={handleStablecoinChange}
              />
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
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      GUSD staking
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deposit Citrea GUSD into the staking vault to earn yield.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-foreground/80">
                      APY {OPPORTUNITY_APY_CAP.citrea}
                    </span>
                    <div className="inline-flex rounded-full border border-border/60 bg-background/80 p-1 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setStakeMode("stake")}
                        aria-pressed={isStakeMode}
                        className={cn(
                          "rounded-full px-3 py-1 transition",
                          isStakeMode
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Stake
                      </button>
                      <button
                        type="button"
                        onClick={() => setStakeMode("unstake")}
                        aria-pressed={isUnstakeMode}
                        className={cn(
                          "rounded-full px-3 py-1 transition",
                          isUnstakeMode
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Unstake
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <SwapAssetPanel
                label={stakePanelLabel}
                chainLabel="Citrea"
                selector={renderAssetSelector(
                  "gusd",
                  isStakeMode ? "GUSD" : "sGUSD",
                )}
                inputProps={{
                  placeholder: stakePanelPlaceholder,
                  autoComplete: "off",
                  value: stakePanelValue,
                  disabled: stakePanelInputDisabled,
                  onChange: (event) => {
                    if (isStakeMode) {
                      setStakeAmount(event.target.value);
                      setStakeAmountTouched(true);
                    } else {
                      setUnstakeAmount(event.target.value);
                    }
                  },
                }}
                balance={{
                  text: stakePanelBalanceText,
                  interactive: stakePanelCanUseMax,
                  onClick: stakePanelCanUseMax ? stakePanelOnMax : undefined,
                }}
              />
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {stakePanelPreviewLabel}
                  </span>
                  <span className="font-semibold text-foreground">
                    {stakePanelPreviewValue}
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
                  onClick={
                    isStakeMode ? handleStakeAction : handleUnstakeAction
                  }
                  disabled={activeStakeButtonState.disabled}
                  className="h-11 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/95 text-sm font-semibold text-primary-foreground transition hover:from-primary/90 hover:via-primary/80 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeStakeButtonState.label}
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
              {!stakeError &&
              isStakeMode &&
              stakeInsufficientBalance &&
              !isStakeAutoBridgePending ? (
                <p className="text-center text-xs text-destructive">
                  Stake amount exceeds your Citrea balance.
                </p>
              ) : null}
              {isUnstakeMode && unstakeInsufficientBalance ? (
                <p className="text-center text-xs text-destructive">
                  Unstake amount exceeds your sGUSD balance.
                </p>
              ) : null}
              {isStakeMode && stakeError ? (
                <p className="text-center text-xs text-destructive">
                  {stakeError}
                </p>
              ) : null}
              {isUnstakeMode && unstakeError ? (
                <p className="text-center text-xs text-destructive">
                  {unstakeError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
