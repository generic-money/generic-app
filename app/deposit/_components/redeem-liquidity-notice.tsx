import { Button } from "@/components/ui/button";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import {
  formatVaultAvailability,
  type RedeemLiquidityState,
} from "./redeem-liquidity";

type RedeemLiquidityNoticeProps = {
  state: RedeemLiquidityState;
  selectedTicker: StablecoinTicker;
  onOpenDetails: () => void;
};

export function RedeemLiquidityNotice({
  state,
  selectedTicker,
  onOpenDetails,
}: RedeemLiquidityNoticeProps) {
  if (state.phase === "idle" || state.phase === "ready") {
    return null;
  }

  if (state.phase === "loading") {
    return (
      <p className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-center text-xs text-muted-foreground">
        Checking current vault availability.
      </p>
    );
  }

  if (state.phase === "unavailable") {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-xs text-destructive">
        Current redeem availability could not be confirmed. Try again in a
        moment.
      </p>
    );
  }

  const availableAmount = state.selectedVault
    ? formatVaultAvailability(state.selectedVault)
    : "0";

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-xs text-destructive">
      <p>
        This withdrawal is available, but not fully in {selectedTicker} right
        now. The {selectedTicker} vault currently has {availableAmount}{" "}
        {selectedTicker} available. Choose another asset or lower the{" "}
        {selectedTicker} amount to continue.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 h-auto px-2 py-1 text-xs text-foreground"
        onClick={onOpenDetails}
      >
        See available assets
      </Button>
    </div>
  );
}
