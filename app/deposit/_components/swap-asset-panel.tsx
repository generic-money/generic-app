import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SwapAssetPanelProps = {
  label: string;
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
  selector,
  inputProps,
  balance,
}: SwapAssetPanelProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-background/70 p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {selector}
      </div>
      <input
        type="number"
        step="any"
        min="0"
        inputMode="decimal"
        {...inputProps}
        className={cn(
          "h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:bg-background focus:shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
          inputProps?.className,
        )}
      />
      {balance.interactive && balance.onClick ? (
        <button
          type="button"
          onClick={balance.onClick}
          className="text-xs font-medium text-muted-foreground transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {balance.text}
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">{balance.text}</p>
      )}
    </div>
  );
}
