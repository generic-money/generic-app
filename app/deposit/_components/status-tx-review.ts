import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import type { StatusExitProgressRecord } from "@/lib/status/exit-progress";
import type { HexAddress } from "@/lib/types/address";

type HexData = `0x${string}`;

export type StatusTxReviewSkip =
  | "predeposit"
  | "liquidity"
  | "balance"
  | "allowance"
  | "send"
  | "receipt"
  | "attestation";

const STATUS_TX_REVIEW_SKIPS = new Set<StatusTxReviewSkip>([
  "predeposit",
  "liquidity",
  "balance",
  "allowance",
  "send",
  "receipt",
  "attestation",
]);

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export type StatusTxReviewConfig = {
  active: boolean;
  skips: Set<StatusTxReviewSkip>;
};

export type StatusTxReviewRequest = {
  address: HexAddress;
  chainId: number;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
};

type StatusTxReviewEvent = {
  step: string;
  phase:
    | "before-write"
    | "dry-submit"
    | "submitted"
    | "confirmed"
    | "manual-advance"
    | "skipped";
  request?: StatusTxReviewRequest;
  txHash?: HexData;
  reason?: string;
  state?: Record<string, unknown>;
};

export type StatusTxReviewSnapshot = {
  active: true;
  skips: StatusTxReviewSkip[];
  account: HexAddress | null;
  route: string;
  flow: string;
  selectedTicker: StablecoinTicker;
  fromAmount: string;
  parsedAmount: string | null;
  statusPredepositAmount: string | null;
  statusExitProgress: StatusExitProgressRecord | null;
  pendingCctpRecord: unknown;
};

export type StatusTxReviewConsole = {
  status: () => StatusTxReviewSnapshot;
  advanceToGUnits: (input: {
    shares: bigint | number | string;
    txHash?: HexData;
  }) => StatusExitProgressRecord;
  advanceToCollateral: (input: {
    amount: bigint | number | string;
    txHash?: HexData;
  }) => StatusExitProgressRecord;
  markBridgeSubmitted: (input: {
    amount: bigint | number | string;
    txHash: HexData;
    recipient?: HexAddress;
  }) => unknown;
  clear: () => void;
};

declare global {
  interface Window {
    gmTxReview?: StatusTxReviewConsole;
  }
}

const isTxReviewEnvironmentEnabled = () =>
  process.env.NODE_ENV !== "production";

export const parseStatusTxReviewConfig = (
  search: string,
  environmentEnabled = isTxReviewEnvironmentEnabled(),
): StatusTxReviewConfig => {
  const params = new URLSearchParams(search);
  const requested = TRUE_VALUES.has(
    (params.get("gmTxReview") ?? "").trim().toLowerCase(),
  );
  const skips = new Set<StatusTxReviewSkip>();

  for (const rawSkip of (params.get("gmSkip") ?? "").split(",")) {
    const skip = rawSkip.trim().toLowerCase() as StatusTxReviewSkip;
    if (STATUS_TX_REVIEW_SKIPS.has(skip)) {
      skips.add(skip);
    }
  }

  return {
    active: requested && environmentEnabled,
    skips,
  };
};

export const getStatusTxReviewConfig = () => {
  if (typeof window === "undefined") {
    return parseStatusTxReviewConfig("");
  }

  return parseStatusTxReviewConfig(window.location.search);
};

export const hasStatusTxReviewSkip = (
  config: StatusTxReviewConfig,
  skip: StatusTxReviewSkip,
) => config.active && config.skips.has(skip);

export const parseStatusTxReviewAmount = (
  value: bigint | number | string,
  label: string,
) => {
  try {
    if (typeof value === "bigint") {
      return value;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new Error(`${label} must be an integer base-unit amount`);
      }

      return BigInt(value);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`${label} is required`);
    }

    return BigInt(trimmed);
  } catch (error) {
    if (error instanceof Error && error.message.includes(label)) {
      throw error;
    }

    throw new Error(`${label} must be an integer base-unit amount`);
  }
};

const serializeForConsole = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeForConsole);
  }

  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !("$$typeof" in value)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        serializeForConsole(item),
      ]),
    );
  }

  return value;
};

export const logStatusTxReviewEvent = (
  config: StatusTxReviewConfig,
  event: StatusTxReviewEvent,
) => {
  if (!config.active) {
    return;
  }

  console.info("[gmTxReview]", serializeForConsole(event));
};
