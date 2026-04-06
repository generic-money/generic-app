import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RedeemLiquidityNotice } from "./redeem-liquidity-notice";
import { VaultAvailabilityDialog } from "./vault-availability-dialog";

const liquidityState = {
  phase: "insufficient" as const,
  selectedVault: {
    ticker: "USDC" as const,
    tokenAddress: "0x0000000000000000000000000000000000000001" as const,
    vaultAddress: "0x0000000000000000000000000000000000000011" as const,
    decimals: 6,
    availableAmountRaw: "10000000",
    availableFormatted: "10",
    normalizedAmountRaw: "10000000000000000000",
  },
  requestedAssets: BigInt(25_000_000),
  availableAssets: BigInt(10_000_000),
};

const vaults = [
  liquidityState.selectedVault,
  {
    ticker: "USDT" as const,
    tokenAddress: "0x0000000000000000000000000000000000000002" as const,
    vaultAddress: "0x0000000000000000000000000000000000000022" as const,
    decimals: 6,
    availableAmountRaw: "45000000",
    availableFormatted: "45",
    normalizedAmountRaw: "45000000000000000000",
  },
];

test("renders careful insufficient-liquidity copy and opens details", async () => {
  const user = userEvent.setup();
  const onOpenDetails = vi.fn();

  render(
    <RedeemLiquidityNotice
      state={liquidityState}
      selectedTicker="USDC"
      onOpenDetails={onOpenDetails}
    />,
  );

  expect(
    screen.getByText(
      /this withdrawal is available, but not fully in USDC right now/i,
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/the USDC vault currently has 10 USDC available/i),
  ).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", { name: /see available assets/i }),
  );

  expect(onOpenDetails).toHaveBeenCalledTimes(1);
});

test("renders the availability dialog and switches assets", async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  const onSelectTicker = vi.fn();

  render(
    <VaultAvailabilityDialog
      open
      onOpenChange={onOpenChange}
      selectedTicker="USDC"
      vaults={vaults}
      onSelectTicker={onSelectTicker}
    />,
  );

  expect(
    screen.getByRole("heading", { name: /available redeem assets/i }),
  ).toBeInTheDocument();
  expect(screen.getByText(/available now: 45 USDT/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /switch to USDT/i }));

  expect(onSelectTicker).toHaveBeenCalledWith("USDT");
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
