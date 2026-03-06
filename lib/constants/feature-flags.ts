const isFlagEnabled = (value: string | undefined) =>
  value === "true" || value === "1";

const HIDE_ALL_ON_REDEEM = isFlagEnabled(
  process.env.NEXT_PUBLIC_HIDE_USDC_USDT_ON_REDEEM,
);

export const HIDE_USDC_ON_REDEEM =
  HIDE_ALL_ON_REDEEM ||
  isFlagEnabled(process.env.NEXT_PUBLIC_HIDE_USDC_ON_REDEEM);

export const HIDE_USDT_ON_REDEEM =
  HIDE_ALL_ON_REDEEM ||
  isFlagEnabled(process.env.NEXT_PUBLIC_HIDE_USDT_ON_REDEEM);
