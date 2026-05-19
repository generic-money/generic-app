import { render, screen } from "@testing-library/react";
import type { ComponentProps, InputHTMLAttributes, ReactNode } from "react";
import { DepositSwap } from "./deposit-swap";

const opportunityRouteMocks = vi.hoisted(() => ({
  useOpportunityRoute: vi.fn(),
}));

const wagmiMocks = vi.hoisted(() => ({
  useAccount: vi.fn(),
  useBalance: vi.fn(),
  useBlockNumber: vi.fn(),
  useChainId: vi.fn(),
  usePublicClient: vi.fn(),
  useReadContract: vi.fn(),
  useSwitchChain: vi.fn(),
  useWriteContract: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
  useErc20Decimals: vi.fn(),
  useErc4626Preview: vi.fn(),
  useRedeemVaultLiquidity: vi.fn(),
  useTokenAllowance: vi.fn(),
}));

const lineaNativeBridgeMocks = vi.hoisted(() => ({
  loadLineaNativeBridgeRecords: vi.fn(() => []),
  pruneLineaNativeBridgeRecords: vi.fn((records) => records),
  saveLineaNativeBridgeRecords: vi.fn(),
  upsertLineaNativeBridgeRecord: vi.fn((records, record) => [
    record,
    ...records,
  ]),
}));

const statusExitProgressMocks = vi.hoisted(() => ({
  clearStatusExitProgressRecord: vi.fn((records, account) =>
    records.filter(
      (record: { account: string }) =>
        record.account.toLowerCase() !== account.toLowerCase(),
    ),
  ),
  loadStatusExitProgressRecords: vi.fn(() => []),
  pruneStatusExitProgressRecords: vi.fn((records) => records),
  saveStatusExitProgressRecords: vi.fn(),
  upsertStatusExitProgressRecord: vi.fn((records, record) => [
    record,
    ...records.filter(
      (item: { account: string }) =>
        item.account.toLowerCase() !== record.account.toLowerCase(),
    ),
  ]),
}));

vi.mock("next/image", () => ({
  default: (_props: ComponentProps<"img">) => <div data-testid="next-image" />,
}));

vi.mock("wagmi", () => ({
  useAccount: wagmiMocks.useAccount,
  useBalance: wagmiMocks.useBalance,
  useBlockNumber: wagmiMocks.useBlockNumber,
  useChainId: wagmiMocks.useChainId,
  usePublicClient: wagmiMocks.usePublicClient,
  useReadContract: wagmiMocks.useReadContract,
  useSwitchChain: wagmiMocks.useSwitchChain,
  useWriteContract: wagmiMocks.useWriteContract,
}));

vi.mock("@/context", () => ({
  useOpportunityRoute: opportunityRouteMocks.useOpportunityRoute,
}));

vi.mock("@/lib/layerzero/scan", () => ({
  fetchLzMessageStatus: vi.fn(),
  isFinalLzStatus: vi.fn(() => false),
  loadLzBridgeRecords: vi.fn(() => []),
  pruneLzBridgeRecords: vi.fn((records) => records),
  saveLzBridgeRecords: vi.fn(),
  upsertLzBridgeRecord: vi.fn((records, record) => [...records, record]),
}));

vi.mock("@/lib/linea/native-bridge", () => ({
  LINEA_BRIDGE_URL: "https://bridge.linea.build/",
  LINEASCAN_L1_TO_L2_URL: "https://lineascan.build/txsDeposits",
  loadLineaNativeBridgeRecords:
    lineaNativeBridgeMocks.loadLineaNativeBridgeRecords,
  pruneLineaNativeBridgeRecords:
    lineaNativeBridgeMocks.pruneLineaNativeBridgeRecords,
  saveLineaNativeBridgeRecords:
    lineaNativeBridgeMocks.saveLineaNativeBridgeRecords,
  upsertLineaNativeBridgeRecord:
    lineaNativeBridgeMocks.upsertLineaNativeBridgeRecord,
}));

vi.mock("@/lib/status/exit-progress", () => ({
  clearStatusExitProgressRecord:
    statusExitProgressMocks.clearStatusExitProgressRecord,
  loadStatusExitProgressRecords:
    statusExitProgressMocks.loadStatusExitProgressRecords,
  pruneStatusExitProgressRecords:
    statusExitProgressMocks.pruneStatusExitProgressRecords,
  saveStatusExitProgressRecords:
    statusExitProgressMocks.saveStatusExitProgressRecords,
  upsertStatusExitProgressRecord:
    statusExitProgressMocks.upsertStatusExitProgressRecord,
}));

vi.mock("./hooks/useErc20Decimals", () => ({
  useErc20Decimals: hookMocks.useErc20Decimals,
}));

vi.mock("./hooks/useErc4626Preview", () => ({
  useErc4626Preview: hookMocks.useErc4626Preview,
}));

vi.mock("./hooks/useRedeemVaultLiquidity", () => ({
  useRedeemVaultLiquidity: hookMocks.useRedeemVaultLiquidity,
}));

vi.mock("./hooks/useTokenAllowance", () => ({
  useTokenAllowance: hookMocks.useTokenAllowance,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    startContent,
  }: {
    children: ReactNode;
    startContent?: ReactNode;
  }) => (
    <div>
      {startContent}
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({
    placeholder,
    "aria-label": ariaLabel,
  }: {
    placeholder?: string;
    "aria-label"?: string;
  }) => <span>{ariaLabel ?? placeholder ?? ""}</span>,
}));

vi.mock("./swap-asset-panel", () => ({
  SwapAssetPanel: ({
    label,
    balance,
    inputProps,
  }: {
    label: string;
    balance: { text: string };
    inputProps?: InputHTMLAttributes<HTMLInputElement>;
  }) => (
    <div>
      <span>{label}</span>
      <input aria-label={label} {...inputProps} />
      <span>{balance.text}</span>
    </div>
  ),
}));

vi.mock("./vault-availability-dialog", () => ({
  VaultAvailabilityDialog: () => null,
}));

vi.mock("./redeem-liquidity-notice", () => ({
  RedeemLiquidityNotice: () => null,
}));

const PAUSED_MESSAGE =
  "Deposits on the Status networks are paused as the chain moves towards its next stage. Funds are safe, you'll hear next steps very soon.";
const ACCOUNT = "0x0000000000000000000000000000000000001234";
const STATUS_CHAIN_NICKNAME =
  "0xa4fdc657c7ba2402ba336e88c4ae1c72169f7bc116987c8aefd50982676d9a17";
const ACCOUNT_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000001234";
const GENERIC_UNIT = "0x8c307baDbd78bEa5A1cCF9677caa58e7A2172502";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_VAULT = "0x4825eFF24F9B7b76EEAFA2ecc6A1D5dFCb3c1c3f";

const setOpportunityRoute = (
  route: "predeposit" | "citrea",
  flow = "deposit",
) => {
  opportunityRouteMocks.useOpportunityRoute.mockReturnValue({
    route,
    setRoute: vi.fn(),
    flow,
    setFlow: vi.fn(),
    redeemEntryRequest: null,
    requestRedeemEntry: vi.fn(),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  lineaNativeBridgeMocks.loadLineaNativeBridgeRecords.mockReturnValue([]);
  lineaNativeBridgeMocks.pruneLineaNativeBridgeRecords.mockImplementation(
    (records) => records,
  );
  statusExitProgressMocks.loadStatusExitProgressRecords.mockReturnValue([]);
  statusExitProgressMocks.pruneStatusExitProgressRecords.mockImplementation(
    (records) => records,
  );

  setOpportunityRoute("predeposit");

  wagmiMocks.useAccount.mockReturnValue({ address: undefined });
  wagmiMocks.useBalance.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  wagmiMocks.useBlockNumber.mockReturnValue({ data: undefined });
  wagmiMocks.useChainId.mockReturnValue(1);
  wagmiMocks.usePublicClient.mockReturnValue(null);
  wagmiMocks.useReadContract.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  wagmiMocks.useSwitchChain.mockReturnValue({ switchChainAsync: vi.fn() });
  wagmiMocks.useWriteContract.mockReturnValue({ writeContractAsync: vi.fn() });

  hookMocks.useErc20Decimals.mockReturnValue({ decimals: 6 });
  hookMocks.useErc4626Preview.mockReturnValue({
    quote: "",
    rawQuote: null,
    parsedAmount: null,
    isError: false,
    isFetching: false,
    isLoading: false,
  });
  hookMocks.useRedeemVaultLiquidity.mockReturnValue({
    status: "idle",
    selectedVault: null,
    data: { vaults: [] },
    refresh: vi.fn(),
  });
  hookMocks.useTokenAllowance.mockReturnValue({
    allowance: BigInt(0),
    refetchAllowance: vi.fn(),
  });
});

test("defaults Status to withdraw-only while deposits are paused", () => {
  render(<DepositSwap />);

  expect(
    screen.getByRole("button", { name: /connect wallet/i }),
  ).toBeDisabled();
  expect(screen.queryByText(/status claim/i)).not.toBeInTheDocument();
  expect(screen.getByText(/claim on linea/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/required after redeeming/i),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /status announcement/i }),
  ).toHaveAttribute(
    "href",
    "https://x.com/StatusL2/status/2049922023661695094",
  );
  expect(screen.queryByText(PAUSED_MESSAGE)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /switch direction/i }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
});

test("keeps the Citrea deposit CTA unaffected", () => {
  setOpportunityRoute("citrea");

  render(<DepositSwap />);

  expect(
    screen.getByRole("button", { name: /connect wallet/i }),
  ).toBeDisabled();
  expect(screen.queryByText(PAUSED_MESSAGE)).not.toBeInTheDocument();
});

test("enables Status withdrawals without exposing USDS", () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: ACCOUNT });
  wagmiMocks.useReadContract.mockImplementation(
    ({ functionName }: { functionName?: string }) => ({
      data: functionName === "getPredeposit" ? BigInt(1_000_000) : undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  );
  hookMocks.useErc4626Preview.mockReturnValue({
    quote: "1",
    rawQuote: BigInt(1_000_000),
    parsedAmount: BigInt(1_000_000),
    isError: false,
    isFetching: false,
    isLoading: false,
  });
  hookMocks.useRedeemVaultLiquidity.mockReturnValue({
    status: "idle",
    selectedVault: {
      ticker: "USDC",
      tokenAddress: "0x0000000000000000000000000000000000000001",
      vaultAddress: "0x0000000000000000000000000000000000000002",
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });

  render(<DepositSwap />);

  expect(
    screen.getByRole("button", { name: /withdraw, redeem & bridge/i }),
  ).toBeEnabled();
  expect(screen.queryByText(/status claim/i)).not.toBeInTheDocument();
  expect(screen.getByText(/claim on linea/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/required after redeeming/i),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /status announcement/i }),
  ).toHaveAttribute(
    "href",
    "https://x.com/StatusL2/status/2049922023661695094",
  );
  expect(screen.queryByText("USDS")).not.toBeInTheDocument();
  expect(wagmiMocks.useReadContract).toHaveBeenCalledWith(
    expect.objectContaining({
      functionName: "getPredeposit",
      args: [STATUS_CHAIN_NICKNAME, ACCOUNT, ACCOUNT_BYTES32],
    }),
  );
});

test("keeps submitted Linea native bridges in a pending claim state", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: ACCOUNT });
  wagmiMocks.useReadContract.mockImplementation(
    ({ functionName }: { functionName?: string }) => ({
      data: functionName === "getPredeposit" ? BigInt(0) : undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  );
  lineaNativeBridgeMocks.loadLineaNativeBridgeRecords.mockReturnValue([
    {
      txHash:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      account: ACCOUNT,
      token: "0x0000000000000000000000000000000000000001",
      ticker: "USDT",
      amount: "1000000",
      recipient: ACCOUNT,
      status: "submitted",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", { name: /usdt bridge pending claim/i }),
  ).toBeDisabled();
  expect(screen.getByText(/pending destination claim/i)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /open linea bridge/i }),
  ).toHaveAttribute("href", "https://bridge.linea.build/");
  expect(
    screen.getByRole("link", { name: /view lineascan deposits/i }),
  ).toHaveAttribute("href", "https://lineascan.build/txsDeposits");
});

test("allows Status exits to continue from withdrawn GUnits", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: ACCOUNT });
  wagmiMocks.useReadContract.mockImplementation(
    ({ functionName }: { functionName?: string }) => ({
      data: functionName === "getPredeposit" ? BigInt(0) : undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  );
  hookMocks.useErc4626Preview.mockReturnValue({
    quote: "1",
    rawQuote: BigInt(1_000_000),
    parsedAmount: BigInt(1_000_000),
    isError: false,
    isFetching: false,
    isLoading: false,
  });
  hookMocks.useRedeemVaultLiquidity.mockReturnValue({
    status: "idle",
    selectedVault: {
      ticker: "USDC",
      tokenAddress: USDC,
      vaultAddress: USDC_VAULT,
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });
  statusExitProgressMocks.loadStatusExitProgressRecords.mockReturnValue([
    {
      account: ACCOUNT,
      stage: "gunit",
      ticker: "USDC",
      chainNickname: STATUS_CHAIN_NICKNAME,
      remoteRecipient: ACCOUNT_BYTES32,
      genericUnitTokenAddress: GENERIC_UNIT,
      stablecoinAddress: USDC,
      vaultAddress: USDC_VAULT,
      bridgeRequested: false,
      shares: "1000000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", {
      name: /continue redeem & bridge/i,
    }),
  ).toBeEnabled();
  expect(screen.getByText(/status withdrawal confirmed/i)).toBeInTheDocument();
});

test("allows Status exits to continue from redeemed collateral", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: ACCOUNT });
  wagmiMocks.useReadContract.mockImplementation(
    ({ functionName }: { functionName?: string }) => ({
      data: functionName === "getPredeposit" ? BigInt(0) : undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  );
  hookMocks.useErc4626Preview.mockReturnValue({
    quote: "",
    rawQuote: null,
    parsedAmount: BigInt(1_000_000),
    isError: false,
    isFetching: false,
    isLoading: false,
  });
  statusExitProgressMocks.loadStatusExitProgressRecords.mockReturnValue([
    {
      account: ACCOUNT,
      stage: "collateral",
      ticker: "USDC",
      chainNickname: STATUS_CHAIN_NICKNAME,
      remoteRecipient: ACCOUNT_BYTES32,
      genericUnitTokenAddress: GENERIC_UNIT,
      stablecoinAddress: USDC,
      vaultAddress: USDC_VAULT,
      bridgeRequested: false,
      collateralAmount: "1000000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", { name: /continue bridge/i }),
  ).toBeEnabled();
  expect(screen.getByText(/status collateral redeemed/i)).toBeInTheDocument();
});
