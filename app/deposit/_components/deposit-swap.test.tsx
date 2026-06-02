import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, InputHTMLAttributes, ReactNode } from "react";
import type { LineaNativeBridgeRecord } from "@/lib/linea/native-bridge";
import type { StatusExitProgressRecord } from "@/lib/status/exit-progress";
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

const appKitMocks = vi.hoisted(() => ({
  open: vi.fn(),
}));

const lineaNativeBridgeMocks = vi.hoisted(() => ({
  loadLineaNativeBridgeRecords: vi.fn<() => LineaNativeBridgeRecord[]>(
    () => [],
  ),
  pruneLineaNativeBridgeRecords: vi.fn(
    (records: LineaNativeBridgeRecord[]) => records,
  ),
  saveLineaNativeBridgeRecords: vi.fn(),
  upsertLineaNativeBridgeRecord: vi.fn(
    (records: LineaNativeBridgeRecord[], record: LineaNativeBridgeRecord) => [
      record,
      ...records,
    ],
  ),
}));

const statusExitProgressMocks = vi.hoisted(() => ({
  clearStatusExitProgressRecord: vi.fn(
    (records: StatusExitProgressRecord[], account: string) =>
      records.filter(
        (record) => record.account.toLowerCase() !== account.toLowerCase(),
      ),
  ),
  loadStatusExitProgressRecords: vi.fn<() => StatusExitProgressRecord[]>(
    () => [],
  ),
  pruneStatusExitProgressRecords: vi.fn(
    (records: StatusExitProgressRecord[]) => records,
  ),
  saveStatusExitProgressRecords: vi.fn(),
  upsertStatusExitProgressRecord: vi.fn(
    (records: StatusExitProgressRecord[], record: StatusExitProgressRecord) => [
      record,
      ...records.filter(
        (item) => item.account.toLowerCase() !== record.account.toLowerCase(),
      ),
    ],
  ),
}));

vi.mock("next/image", () => ({
  default: (_props: ComponentProps<"img">) => <div data-testid="next-image" />,
}));

vi.mock("@reown/appkit/react", () => ({
  modal: {
    open: appKitMocks.open,
  },
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
const RECIPIENT_ACCOUNT = "0x0000000000000000000000000000000000005678";
const STATUS_CHAIN_NICKNAME =
  "0xa4fdc657c7ba2402ba336e88c4ae1c72169f7bc116987c8aefd50982676d9a17";
const ACCOUNT_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000001234";
const CCTP_MESSAGE_NONCE =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const CCTP_MESSAGE_WITH_NONCE = `0x${"00".repeat(12)}${CCTP_MESSAGE_NONCE.slice(2)}${"00".repeat(104)}`;
const GENERIC_UNIT = "0x8c307baDbd78bEa5A1cCF9677caa58e7A2172502";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_VAULT = "0x4825eFF24F9B7b76EEAFA2ecc6A1D5dFCb3c1c3f";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDT_VAULT = "0xB8280955aE7b5207AF4CDbdCd775135Bd38157fE";
const LINEA_TOKEN_BRIDGE = "0x051F1D88f0aF5763fB888eC4378b4D8B29ea3319";

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

const confirmLineaRecipient = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: /recipient on linea mainnet/i }),
    ).toHaveDisplayValue(ACCOUNT),
  );
  await user.click(
    screen.getByRole("checkbox", {
      name: /i control this recipient on linea mainnet/i,
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.gmTxReview;
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

  expect(screen.getByPlaceholderText("Amount in USDT")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /connect wallet/i }),
  ).toBeDisabled();
  expect(screen.queryByText(/status claim/i)).not.toBeInTheDocument();
  expect(screen.getByText(/bridge to linea mainnet/i)).toBeInTheDocument();
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

  expect(screen.getByPlaceholderText("Amount in USDC")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /connect wallet/i }),
  ).toBeDisabled();
  expect(screen.queryByText(PAUSED_MESSAGE)).not.toBeInTheDocument();
});

test("requires recipient confirmation before enabling Status withdrawals", async () => {
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
      ticker: "USDT",
      tokenAddress: USDT,
      vaultAddress: USDT_VAULT,
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });

  const user = userEvent.setup();

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", { name: /confirm linea recipient/i }),
  ).toBeDisabled();
  expect(
    screen.getByRole("textbox", { name: /recipient on linea mainnet/i }),
  ).toHaveDisplayValue(ACCOUNT);
  await confirmLineaRecipient(user);
  expect(
    screen.getByRole("button", { name: /withdraw, redeem & bridge/i }),
  ).toBeEnabled();
  expect(screen.queryByText(/status claim/i)).not.toBeInTheDocument();
  expect(screen.getByText(/bridge to linea mainnet/i)).toBeInTheDocument();
  expect(screen.queryByText(/15-20 minutes/i)).not.toBeInTheDocument();
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

test("keeps edited Status Linea recipient after remount without confirming it", async () => {
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
      ticker: "USDT",
      tokenAddress: USDT,
      vaultAddress: USDT_VAULT,
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });
  const user = userEvent.setup();

  const { unmount } = render(<DepositSwap />);
  const recipientInput = await screen.findByRole("textbox", {
    name: /recipient on linea mainnet/i,
  });

  await user.clear(recipientInput);
  await user.type(recipientInput, RECIPIENT_ACCOUNT);
  await user.click(
    screen.getByRole("checkbox", {
      name: /i control this recipient on linea mainnet/i,
    }),
  );
  await waitFor(() =>
    expect(
      window.sessionStorage.getItem("generic.statusLineaRecipientDrafts"),
    ).toContain(RECIPIENT_ACCOUNT),
  );

  unmount();
  render(<DepositSwap />);

  expect(
    await screen.findByRole("textbox", {
      name: /recipient on linea mainnet/i,
    }),
  ).toHaveDisplayValue(RECIPIENT_ACCOUNT);
  expect(
    screen.getByRole("checkbox", {
      name: /i control this recipient on linea mainnet/i,
    }),
  ).not.toBeChecked();
  expect(
    screen.getByRole("button", { name: /confirm linea recipient/i }),
  ).toBeDisabled();
});

test("does not loop when restored Status progress uses an unsupported stablecoin", async () => {
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
  statusExitProgressMocks.loadStatusExitProgressRecords.mockReturnValue([
    {
      account: ACCOUNT,
      stage: "gunit",
      ticker: "USDS",
      chainNickname: STATUS_CHAIN_NICKNAME,
      remoteRecipient: ACCOUNT_BYTES32,
      genericUnitTokenAddress: GENERIC_UNIT,
      stablecoinAddress: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
      vaultAddress: "0x6133dA4Cd25773Ebd38542a8aCEF8F94cA89892A",
      bridgeRequested: true,
      bridgeRecipient: ACCOUNT,
      shares: "1000000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", { name: /preparing recovery/i }),
  ).toBeDisabled();
});

test("uses a newer recipient draft over an older Status progress recipient", async () => {
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
  const progressUpdatedAt = Date.now() - 1_000;
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
      bridgeRequested: true,
      bridgeRecipient: ACCOUNT,
      shares: "1000000",
      createdAt: progressUpdatedAt,
      updatedAt: progressUpdatedAt,
    },
  ]);
  window.sessionStorage.setItem(
    "generic.statusLineaRecipientDrafts",
    JSON.stringify({
      [ACCOUNT.toLowerCase()]: {
        recipient: RECIPIENT_ACCOUNT,
        updatedAt: progressUpdatedAt + 500,
      },
    }),
  );

  render(<DepositSwap />);

  expect(
    await screen.findByRole("textbox", {
      name: /recipient on linea mainnet/i,
    }),
  ).toHaveDisplayValue(RECIPIENT_ACCOUNT);
  expect(
    screen.getByRole("checkbox", {
      name: /i control this recipient on linea mainnet/i,
    }),
  ).not.toBeChecked();
});

test("shows the CCTP wait estimate while USDC bridge attestation is pending", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: ACCOUNT });
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          messages: [{ status: "pending_confirmations" }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    ),
  );
  window.localStorage.setItem(
    "generic.cctpBridgeRecords",
    JSON.stringify([
      {
        txHash:
          "0x2222222222222222222222222222222222222222222222222222222222222222",
        account: ACCOUNT,
        amount: "1000000",
        recipient: ACCOUNT,
        sourceDomain: 0,
        destinationDomain: 11,
        status: "submitted",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]),
  );

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", {
      name: /waiting for circle attestation/i,
    }),
  ).toBeDisabled();
  expect(
    await screen.findByText(/Circle is waiting for Ethereum finality/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/15-20 minutes/i)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /view ethereum tx/i }),
  ).toHaveAttribute(
    "href",
    "https://etherscan.io/tx/0x2222222222222222222222222222222222222222222222222222222222222222",
  );
  expect(screen.getByRole("link", { name: /circle status/i })).toHaveAttribute(
    "href",
    "https://iris-api.circle.com/v2/messages/0?transactionHash=0x2222222222222222222222222222222222222222222222222222222222222222",
  );
  fetchSpy.mockRestore();
});

test("shows ready CCTP claims when connected as the Linea recipient", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: RECIPIENT_ACCOUNT });
  wagmiMocks.useChainId.mockReturnValue(59144);
  window.localStorage.setItem(
    "generic.cctpBridgeRecords",
    JSON.stringify([
      {
        txHash:
          "0x3333333333333333333333333333333333333333333333333333333333333333",
        account: ACCOUNT,
        amount: "1000000",
        recipient: RECIPIENT_ACCOUNT,
        sourceDomain: 0,
        destinationDomain: 11,
        status: "attested",
        message: "0x1234",
        attestation: "0xabcd",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]),
  );

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", { name: /finalize usdc on linea/i }),
  ).toBeEnabled();
  expect(
    screen.getByText(/attestation ready. waiting for usdc to arrive/i),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /switch to recipient wallet/i }),
  ).not.toBeInTheDocument();
});

test("marks CCTP bridges delivered when the Linea message is already used", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: RECIPIENT_ACCOUNT });
  wagmiMocks.useChainId.mockReturnValue(59144);
  const readContract = vi.fn().mockResolvedValue(BigInt(1));
  wagmiMocks.usePublicClient.mockReturnValue({
    readContract,
    waitForTransactionReceipt: vi.fn(),
  });
  window.localStorage.setItem(
    "generic.cctpBridgeRecords",
    JSON.stringify([
      {
        txHash:
          "0x3535353535353535353535353535353535353535353535353535353535353535",
        account: ACCOUNT,
        amount: "1000000",
        recipient: RECIPIENT_ACCOUNT,
        sourceDomain: 0,
        destinationDomain: 11,
        status: "attested",
        message: CCTP_MESSAGE_WITH_NONCE,
        attestation: "0xabcd",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]),
  );

  render(<DepositSwap />);

  expect(
    await screen.findByText(/USDC was delivered on Linea automatically/i),
  ).toBeInTheDocument();
  expect(readContract).toHaveBeenCalledWith(
    expect.objectContaining({
      functionName: "usedNonces",
      args: [CCTP_MESSAGE_NONCE],
    }),
  );
  expect(
    screen.queryByRole("button", { name: /finalize usdc on linea/i }),
  ).not.toBeInTheDocument();
});

test("treats already-used CCTP claim errors as delivered", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: RECIPIENT_ACCOUNT });
  wagmiMocks.useChainId.mockReturnValue(59144);
  wagmiMocks.usePublicClient.mockReturnValue({
    readContract: vi.fn().mockResolvedValue(BigInt(0)),
    waitForTransactionReceipt: vi.fn(),
  });
  const writeContractAsync = vi
    .fn()
    .mockRejectedValue(new Error("execution reverted: Nonce already used"));
  wagmiMocks.useWriteContract.mockReturnValue({ writeContractAsync });
  window.localStorage.setItem(
    "generic.cctpBridgeRecords",
    JSON.stringify([
      {
        txHash:
          "0x3636363636363636363636363636363636363636363636363636363636363636",
        account: ACCOUNT,
        amount: "1000000",
        recipient: RECIPIENT_ACCOUNT,
        sourceDomain: 0,
        destinationDomain: 11,
        status: "attested",
        message: CCTP_MESSAGE_WITH_NONCE,
        attestation: "0xabcd",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]),
  );
  const user = userEvent.setup();

  render(<DepositSwap />);

  await user.click(
    await screen.findByRole("button", {
      name: /finalize usdc on linea/i,
    }),
  );

  expect(
    await screen.findByText(/USDC was delivered on Linea automatically/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/USDC claim failed/i)).not.toBeInTheDocument();
});

test("flags missing Linea gas before claiming ready CCTP USDC", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: RECIPIENT_ACCOUNT });
  wagmiMocks.useChainId.mockReturnValue(59144);
  wagmiMocks.useBalance.mockImplementation(
    ({ chainId, token }: { chainId?: number; token?: unknown }) => ({
      data:
        chainId === 59144 && !token
          ? { value: BigInt(0), formatted: "0", symbol: "ETH" }
          : undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  );
  window.localStorage.setItem(
    "generic.cctpBridgeRecords",
    JSON.stringify([
      {
        txHash:
          "0x3434343434343434343434343434343434343434343434343434343434343434",
        account: ACCOUNT,
        amount: "1000000",
        recipient: RECIPIENT_ACCOUNT,
        sourceDomain: 0,
        destinationDomain: 11,
        status: "attested",
        message: "0x1234",
        attestation: "0xabcd",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]),
  );

  render(<DepositSwap />);

  expect(
    await screen.findByRole("button", { name: /finalize usdc on linea/i }),
  ).toBeDisabled();
  expect(
    screen.getByText(/needs ETH on Linea to pay gas/i),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /bridge eth to linea/i }),
  ).toHaveAttribute("href", "https://bridge.linea.build/");
});

test("prompts mismatched CCTP claim wallets while allowing permissionless claim", async () => {
  setOpportunityRoute("predeposit", "redeem");
  wagmiMocks.useAccount.mockReturnValue({ address: ACCOUNT });
  wagmiMocks.useChainId.mockReturnValue(59144);
  const waitForTransactionReceipt = vi.fn().mockResolvedValue({});
  wagmiMocks.usePublicClient.mockReturnValue({ waitForTransactionReceipt });
  const writeContractAsync = vi
    .fn()
    .mockRejectedValue(
      new Error(
        "An unknown RPC error occurred. data: 0x57ecfd28 Details: Request expired. Please try again.",
      ),
    );
  wagmiMocks.useWriteContract.mockReturnValue({ writeContractAsync });
  window.localStorage.setItem(
    "generic.cctpBridgeRecords",
    JSON.stringify([
      {
        txHash:
          "0x4444444444444444444444444444444444444444444444444444444444444444",
        account: ACCOUNT,
        amount: "1000000",
        recipient: RECIPIENT_ACCOUNT,
        sourceDomain: 0,
        destinationDomain: 11,
        status: "attested",
        message: "0x1234",
        attestation: "0xabcd",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]),
  );
  const user = userEvent.setup();

  render(<DepositSwap />);

  await user.click(
    await screen.findByRole("button", {
      name: /switch to recipient wallet/i,
    }),
  );
  expect(appKitMocks.open).toHaveBeenCalledWith({ view: "Account" });
  expect(screen.queryByText(/USDC will be minted to/i)).not.toBeInTheDocument();
  expect(
    screen.getByText(/funds will arrive at the Linea recipient/i),
  ).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", {
      name: /finalize to recipient from this wallet/i,
    }),
  );

  await waitFor(() =>
    expect(writeContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "receiveMessage",
        chainId: 59144,
      }),
    ),
  );
  expect(
    await screen.findByText(/wallet request expired/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/0x57ecfd28/i)).not.toBeInTheDocument();
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
  expect(screen.getByText(/usually takes 15-20 minutes/i)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /open linea bridge/i }),
  ).toHaveAttribute("href", "https://bridge.linea.build/");
  expect(
    screen.getByRole("link", { name: /track on lineascan/i }),
  ).toHaveAttribute("href", "https://lineascan.build/txsDeposits");
});

test("requires recipient confirmation when continuing from withdrawn GUnits", async () => {
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
      bridgeRequested: true,
      bridgeRecipient: ACCOUNT,
      shares: "1000000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);
  const user = userEvent.setup();

  render(<DepositSwap />);

  const recipientInput = await screen.findByRole("textbox", {
    name: /recipient on linea mainnet/i,
  });
  const recipientCheckbox = screen.getByRole("checkbox", {
    name: /i control this recipient on linea mainnet/i,
  });

  expect(recipientInput).toHaveDisplayValue(ACCOUNT);
  expect(recipientInput).toBeEnabled();
  expect(recipientCheckbox).not.toBeChecked();
  expect(
    screen.getByRole("button", { name: /confirm linea recipient/i }),
  ).toBeDisabled();

  await user.clear(recipientInput);
  await user.type(recipientInput, RECIPIENT_ACCOUNT);
  await user.click(recipientCheckbox);

  expect(recipientInput).toHaveDisplayValue(RECIPIENT_ACCOUNT);
  expect(
    screen.getByRole("button", {
      name: /continue redeem & bridge/i,
    }),
  ).toBeEnabled();
  expect(
    screen.getByText(/predeposit withdrawal confirmed/i),
  ).toBeInTheDocument();
});

test("allows Status exits to continue from redeemed collateral after recipient confirmation", async () => {
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
      bridgeRequested: true,
      bridgeRecipient: ACCOUNT,
      collateralAmount: "1000000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);
  const user = userEvent.setup();

  render(<DepositSwap />);

  await user.click(
    await screen.findByRole("checkbox", {
      name: /i control this recipient on linea mainnet/i,
    }),
  );
  expect(
    await screen.findByRole("button", { name: /continue bridge/i }),
  ).toBeEnabled();
  expect(screen.getByText(/status collateral redeemed/i)).toBeInTheDocument();
});

test("exposes URL-gated Status tx review helpers", async () => {
  window.history.pushState({}, "", "/deposit?gmTxReview=1");
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
  const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});

  render(<DepositSwap />);

  await waitFor(() => expect(window.gmTxReview).toBeDefined());
  const txReview = window.gmTxReview;
  if (!txReview) {
    throw new Error("Expected tx review helper to be installed");
  }

  let record: unknown;
  act(() => {
    record = txReview.advanceToGUnits({ shares: "1000000" });
  });

  expect(record).toEqual(
    expect.objectContaining({
      account: ACCOUNT,
      stage: "gunit",
      ticker: "USDT",
      shares: "1000000",
      genericUnitTokenAddress: GENERIC_UNIT,
      stablecoinAddress: USDT,
      vaultAddress: USDT_VAULT,
    }),
  );
  expect(consoleInfo).toHaveBeenCalledWith(
    "[gmTxReview]",
    expect.objectContaining({
      phase: "manual-advance",
      step: "status.manual.gunits",
    }),
  );

  consoleInfo.mockRestore();
});

test("lets review mode skip the predeposit availability check", async () => {
  window.history.pushState(
    {},
    "",
    "/deposit?gmTxReview=1&gmSkip=predeposit,balance",
  );
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
      ticker: "USDT",
      tokenAddress: USDT,
      vaultAddress: USDT_VAULT,
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });

  const user = userEvent.setup();

  render(<DepositSwap />);

  await confirmLineaRecipient(user);
  expect(
    screen.getByRole("button", { name: /withdraw, redeem & bridge/i }),
  ).toBeEnabled();
});

test("logs Status tx review writes in transaction order", async () => {
  window.history.pushState({}, "", "/deposit?gmTxReview=1&gmSkip=attestation");
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
      ticker: "USDT",
      tokenAddress: USDT,
      vaultAddress: USDT_VAULT,
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });

  let genericBalanceReads = 0;
  let stablecoinBalanceReads = 0;
  const readContract = vi.fn(
    ({
      address,
      functionName,
      args,
    }: {
      address?: string;
      functionName?: string;
      args?: readonly unknown[];
    }) => {
      if (functionName === "balanceOf" && address === GENERIC_UNIT) {
        genericBalanceReads += 1;
        return genericBalanceReads === 1 ? BigInt(0) : BigInt(1_000_000);
      }
      if (functionName === "balanceOf" && address === USDT) {
        stablecoinBalanceReads += 1;
        return stablecoinBalanceReads === 1 ? BigInt(0) : BigInt(1_000_000);
      }
      if (functionName === "allowance" && args?.[1] === USDT_VAULT) {
        return BigInt(0);
      }
      if (functionName === "allowance" && args?.[1] === LINEA_TOKEN_BRIDGE) {
        return BigInt(0);
      }
      if (functionName === "allowance") {
        return BigInt(1_000_000);
      }
      if (functionName === "messageService") {
        return "0x0000000000000000000000000000000000009999";
      }
      if (functionName === "minimumFeeInWei") {
        return BigInt(0);
      }
      if (functionName === "totalAssets") {
        return BigInt(1_000_000);
      }
      if (functionName === "maxWithdraw") {
        return BigInt(1_000_000);
      }
      if (functionName === "maxRedeem") {
        return BigInt(1_000_000);
      }
      if (functionName === "previewRedeem") {
        return BigInt(1_000_000);
      }
      return BigInt(0);
    },
  );
  const waitForTransactionReceipt = vi.fn().mockResolvedValue({});
  wagmiMocks.usePublicClient.mockReturnValue({
    readContract,
    waitForTransactionReceipt,
  });
  const writeContractAsync = vi
    .fn()
    .mockResolvedValueOnce(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    )
    .mockResolvedValueOnce(
      "0x0000000000000000000000000000000000000000000000000000000000000002",
    )
    .mockResolvedValueOnce(
      "0x0000000000000000000000000000000000000000000000000000000000000003",
    )
    .mockResolvedValueOnce(
      "0x0000000000000000000000000000000000000000000000000000000000000004",
    )
    .mockResolvedValueOnce(
      "0x0000000000000000000000000000000000000000000000000000000000000005",
    );
  wagmiMocks.useWriteContract.mockReturnValue({ writeContractAsync });
  const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
  const user = userEvent.setup();

  render(<DepositSwap />);

  await confirmLineaRecipient(user);
  await user.click(
    screen.getByRole("button", { name: /withdraw, redeem & bridge/i }),
  );

  await waitFor(() => expect(writeContractAsync).toHaveBeenCalledTimes(5));
  expect(writeContractAsync.mock.calls.map(([request]) => request)).toEqual([
    expect.objectContaining({
      address: "0x0503F2C5A1a4b72450c6Cfa790F2097CF5cB6a01",
      functionName: "withdrawPredeposit",
      args: [
        STATUS_CHAIN_NICKNAME,
        ACCOUNT_BYTES32,
        ACCOUNT,
        expect.any(String),
      ],
    }),
    expect.objectContaining({
      address: GENERIC_UNIT,
      functionName: "approve",
      args: [USDT_VAULT, BigInt(1_000_000)],
    }),
    expect.objectContaining({
      address: USDT_VAULT,
      functionName: "redeem",
      args: [BigInt(1_000_000), ACCOUNT, ACCOUNT],
    }),
    expect.objectContaining({
      address: USDT,
      functionName: "approve",
      args: [LINEA_TOKEN_BRIDGE, BigInt(1_000_000)],
    }),
    expect.objectContaining({
      address: LINEA_TOKEN_BRIDGE,
      functionName: "bridgeToken",
      args: [USDT, BigInt(1_000_000), ACCOUNT],
      value: BigInt(0),
    }),
  ]);
  expect(
    waitForTransactionReceipt.mock.calls.map(([request]) => request),
  ).toEqual([
    {
      hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
      confirmations: 2,
    },
    {
      hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
      confirmations: 2,
    },
    {
      hash: "0x0000000000000000000000000000000000000000000000000000000000000003",
      confirmations: 2,
    },
    {
      hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
      confirmations: 2,
    },
    {
      hash: "0x0000000000000000000000000000000000000000000000000000000000000005",
      confirmations: 2,
    },
  ]);
  expect(
    consoleInfo.mock.calls
      .filter(([label]) => label === "[gmTxReview]")
      .map(([, event]) => event.step),
  ).toEqual(
    expect.arrayContaining([
      "status.withdrawPredeposit",
      "status.redeem.approve",
      "status.redeem",
      "status.linea.approve",
      "status.linea.bridge",
    ]),
  );

  consoleInfo.mockRestore();
});

test("pauses after each dry-submitted Status tx review write", async () => {
  window.history.pushState(
    {},
    "",
    "/deposit?gmTxReview=1&gmSkip=send,balance,liquidity,attestation",
  );
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
      ticker: "USDT",
      tokenAddress: USDT,
      vaultAddress: USDT_VAULT,
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });

  const readContract = vi.fn(({ functionName }: { functionName?: string }) => {
    if (functionName === "allowance") {
      return BigInt(0);
    }
    if (
      functionName === "totalAssets" ||
      functionName === "maxWithdraw" ||
      functionName === "maxRedeem" ||
      functionName === "previewRedeem"
    ) {
      return BigInt(1_000_000);
    }
    return BigInt(0);
  });
  const waitForTransactionReceipt = vi.fn();
  wagmiMocks.usePublicClient.mockReturnValue({
    readContract,
    waitForTransactionReceipt,
  });
  const writeContractAsync = vi.fn();
  wagmiMocks.useWriteContract.mockReturnValue({ writeContractAsync });
  const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
  const user = userEvent.setup();
  const drySubmitSteps = () =>
    consoleInfo.mock.calls
      .filter(
        ([label, event]) =>
          label === "[gmTxReview]" && event?.phase === "dry-submit",
      )
      .map(([, event]) => event.step);
  const drySubmitHashes = () =>
    consoleInfo.mock.calls
      .filter(
        ([label, event]) =>
          label === "[gmTxReview]" && event?.phase === "dry-submit",
      )
      .map(([, event]) => event.txHash);
  const clickPrimaryAction = async () => {
    await user.click(
      screen.getByRole("button", {
        name: /withdraw, redeem & bridge|continue redeem & bridge|continue bridge/i,
      }),
    );
  };

  render(<DepositSwap />);

  await confirmLineaRecipient(user);
  await clickPrimaryAction();
  await waitFor(() =>
    expect(drySubmitSteps()).toEqual(["status.withdrawPredeposit"]),
  );
  await waitFor(() => expect(window.gmTxReview).toBeDefined());
  act(() => {
    window.gmTxReview?.advanceToGUnits({ shares: "1000000" });
  });

  await clickPrimaryAction();
  await waitFor(() =>
    expect(drySubmitSteps()).toEqual([
      "status.withdrawPredeposit",
      "status.redeem.approve",
    ]),
  );

  await clickPrimaryAction();
  await waitFor(() =>
    expect(drySubmitSteps()).toEqual([
      "status.withdrawPredeposit",
      "status.redeem.approve",
      "status.redeem",
    ]),
  );
  act(() => {
    window.gmTxReview?.advanceToCollateral({ amount: "1000000" });
  });

  await clickPrimaryAction();
  await waitFor(() =>
    expect(drySubmitSteps()).toEqual([
      "status.withdrawPredeposit",
      "status.redeem.approve",
      "status.redeem",
      "status.linea.approve",
    ]),
  );

  await clickPrimaryAction();

  await waitFor(() =>
    expect(drySubmitSteps()).toEqual([
      "status.withdrawPredeposit",
      "status.redeem.approve",
      "status.redeem",
      "status.linea.approve",
      "status.linea.bridge",
    ]),
  );
  expect(drySubmitHashes()).toEqual([
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000002",
    "0x0000000000000000000000000000000000000000000000000000000000000003",
    "0x0000000000000000000000000000000000000000000000000000000000000004",
    "0x0000000000000000000000000000000000000000000000000000000000000005",
  ]);
  expect(writeContractAsync).not.toHaveBeenCalled();
  expect(waitForTransactionReceipt).not.toHaveBeenCalled();

  consoleInfo.mockRestore();
});

test("guards the primary action against duplicate wallet prompts", async () => {
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
      ticker: "USDT",
      tokenAddress: USDT,
      vaultAddress: USDT_VAULT,
      decimals: 6,
      availableAmountRaw: "1000000",
      availableFormatted: "1",
      normalizedAmountRaw: "1000000000000000000",
    },
    data: { vaults: [] },
    refresh: vi.fn(),
  });
  wagmiMocks.usePublicClient.mockReturnValue({
    readContract: vi.fn(({ functionName }: { functionName?: string }) => {
      if (functionName === "balanceOf") {
        return BigInt(0);
      }
      return BigInt(1_000_000);
    }),
    waitForTransactionReceipt: vi.fn(),
  });
  const writeContractAsync = vi.fn(() => new Promise(() => {}));
  wagmiMocks.useWriteContract.mockReturnValue({ writeContractAsync });

  render(<DepositSwap />);

  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: /recipient on linea mainnet/i }),
    ).toHaveDisplayValue(ACCOUNT),
  );
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /i control this recipient on linea mainnet/i,
    }),
  );
  const button = screen.getByRole("button", {
    name: /withdraw, redeem & bridge/i,
  });
  fireEvent.click(button);
  fireEvent.click(button);

  await waitFor(() => expect(writeContractAsync).toHaveBeenCalledTimes(1));
});
