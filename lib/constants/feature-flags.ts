const isFlagEnabled = (value: string | undefined) =>
  value === "true" || value === "1";

export const HIDE_USDC_ON_REDEEM = isFlagEnabled(
  process.env.NEXT_PUBLIC_HIDE_USDC_ON_REDEEM,
);
