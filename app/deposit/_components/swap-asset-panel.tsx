import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SwapAssetPanelProps = {
  label: string;
  chainLabel?: string;
  selector: ReactNode;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  balance: {
    text: string;
    interactive?: boolean;
    onClick?: () => void;
  };
};

export function SwapAssetPanel({
  label,
  chainLabel,
  selector,
  inputProps,
  balance,
}: SwapAssetPanelProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </span>
          {chainLabel ? (
            <span className="text-[11px] font-medium text-muted-foreground">
              {chainLabel}
            </span>
          ) : null}
        </div>
        {selector}
      </div>
      <input
        type="number"
        step="any"
        min="0"
        inputMode="decimal"
        {...inputProps}
        className={cn(
          "h-12 w-full rounded-xl border border-border/80 bg-muted/30 px-4 text-lg font-semibold text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-background focus:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
          inputProps?.className,
        )}
      />
      {balance.interactive && balance.onClick ? (
        <button
          type="button"
          onClick={balance.onClick}
          className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {balance.text}
        </button>
      ) : (
        <p className="text-[11px] text-muted-foreground">{balance.text}</p>
      )}
    </div>
  );
}
