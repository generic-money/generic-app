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

test("renders a disabled paused CTA and message for Status deposits", () => {
  render(<DepositSwap />);

  expect(
    screen.getByRole("button", { name: /deposits paused/i }),
  ).toBeDisabled();
  expect(screen.getByText(PAUSED_MESSAGE)).toBeInTheDocument();
});

test("keeps the Citrea deposit CTA unaffected", () => {
  setOpportunityRoute("citrea");

  render(<DepositSwap />);

  expect(
    screen.getByRole("button", { name: /connect wallet/i }),
  ).toBeDisabled();
  expect(screen.queryByText(PAUSED_MESSAGE)).not.toBeInTheDocument();
});
