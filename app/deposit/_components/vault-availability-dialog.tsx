import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import type { MainnetVaultLiquidityItem } from "@/lib/types/mainnet-vault-liquidity";
import { formatVaultAvailability } from "./redeem-liquidity";

type VaultAvailabilityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTicker: StablecoinTicker;
  vaults: MainnetVaultLiquidityItem[];
  onSelectTicker: (ticker: StablecoinTicker) => void;
};

export function VaultAvailabilityDialog({
  open,
  onOpenChange,
  selectedTicker,
  vaults,
  onSelectTicker,
}: VaultAvailabilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Available redeem assets</DialogTitle>
          <DialogDescription>
            Your position is intact. These balances show what each vault can
            currently pay out immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-3">
          {vaults.map((vault) => {
            const isSelected = vault.ticker === selectedTicker;
            const availableAmount = formatVaultAvailability(vault);
            const hasLiquidity = BigInt(vault.availableAmountRaw) > BigInt(0);

            return (
              <div
                key={vault.vaultAddress}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {vault.ticker}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available now: {availableAmount} {vault.ticker}
                  </p>
                </div>
                <Button
                  variant={isSelected ? "outline" : "default"}
                  size="sm"
                  disabled={isSelected || !hasLiquidity}
                  onClick={() => {
                    onSelectTicker(vault.ticker);
                    onOpenChange(false);
                  }}
                >
                  {isSelected
                    ? "Selected"
                    : hasLiquidity
                      ? `Switch to ${vault.ticker}`
                      : "Unavailable"}
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
