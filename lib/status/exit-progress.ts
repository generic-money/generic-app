import type { StablecoinTicker } from "@/lib/constants/stablecoins";
import type { HexAddress } from "@/lib/types/address";

type HexData = `0x${string}`;

export type StatusExitProgressRecord = {
  account: HexAddress;
  stage: "gunit" | "collateral";
  ticker: StablecoinTicker;
  chainNickname: HexData;
  remoteRecipient: HexData;
  genericUnitTokenAddress: HexAddress;
  stablecoinAddress: HexAddress;
  vaultAddress: HexAddress;
  bridgeRequested: boolean;
  bridgeRecipient?: HexAddress;
  shares?: string;
  collateralAmount?: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "generic.statusExitProgress";
const RECORD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const pruneStatusExitProgressRecords = (
  records: StatusExitProgressRecord[],
  now = Date.now(),
) => {
  const pruned = records.filter(
    (record) => now - record.updatedAt < RECORD_TTL_MS,
  );

  return pruned.length === records.length ? records : pruned;
};

export const loadStatusExitProgressRecords = (): StatusExitProgressRecord[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed)
      ? (parsed as StatusExitProgressRecord[])
      : [];
    const pruned = pruneStatusExitProgressRecords(records);

    if (pruned !== records) {
      saveStatusExitProgressRecords(pruned);
    }

    return pruned;
  } catch {
    return [];
  }
};

export const saveStatusExitProgressRecords = (
  records: StatusExitProgressRecord[],
) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Funds have already moved onchain; storage failure should not block recovery.
  }
};

export const upsertStatusExitProgressRecord = (
  records: StatusExitProgressRecord[],
  record: StatusExitProgressRecord,
) => {
  const account = record.account.toLowerCase();
  const withoutRecord = records.filter(
    (item) =>
      typeof item.account !== "string" ||
      item.account.toLowerCase() !== account,
  );

  return [record, ...withoutRecord];
};

export const clearStatusExitProgressRecord = (
  records: StatusExitProgressRecord[],
  account: HexAddress,
) => {
  const normalized = account.toLowerCase();
  const next = records.filter(
    (record) =>
      typeof record.account !== "string" ||
      record.account.toLowerCase() !== normalized,
  );

  return next.length === records.length ? records : next;
};
