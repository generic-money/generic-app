type BalanceLike = {
  isLoading: boolean;
  isError: boolean;
  data?: {
    formatted?: string;
  } | null;
};

export const formatTokenAmount = (value: string, precision = 6) => {
  const [whole, fraction] = value.split(".");
  if (!fraction) {
    return whole;
  }

  const trimmedFraction = fraction.replace(/0+$/, "");
  const limitedFraction = trimmedFraction.slice(0, precision);
  return limitedFraction ? `${whole}.${limitedFraction}` : whole;
};

export const formatBalanceText = (
  balance: BalanceLike,
  accountAddress?: string,
) => {
  if (!accountAddress) {
    return "Balance: —";
  }

  if (balance.isLoading) {
    return "Balance: loading…";
  }

  if (balance.isError) {
    return "Balance: unavailable";
  }

  const formatted = balance.data?.formatted;
  if (!formatted) {
    return "Balance: $0.00";
  }

  const numericValue = Number.parseFloat(formatted);
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return "Balance: $0.00";
  }

  if (numericValue < 0.0001) {
    return "Balance: <$0.0001";
  }

  const decimalPlaces = numericValue >= 1 ? 2 : 4;

  return `Balance: $${numericValue.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })}`;
};
