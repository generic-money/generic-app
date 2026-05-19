import type { HexAddress } from "@/lib/types/address";

type HexHash = `0x${string}`;

export type LineaNativeBridgeRecord = {
  txHash: HexHash;
  account: HexAddress;
  token: HexAddress;
  ticker: string;
  amount: string;
  recipient: HexAddress;
  status: "submitted";
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "generic.lineaNativeBridgeRecords";
const RECORD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const LINEA_BRIDGE_URL = "https://bridge.linea.build/";
export const LINEASCAN_L1_TO_L2_URL = "https://lineascan.build/txsDeposits";

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

export const pruneLineaNativeBridgeRecords = (
  records: LineaNativeBridgeRecord[],
  now = Date.now(),
) => {
  const pruned = records.filter(
    (record) => now - record.updatedAt < RECORD_TTL_MS,
  );

  return pruned.length === records.length ? records : pruned;
};

export const loadLineaNativeBridgeRecords = (): LineaNativeBridgeRecord[] => {
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
      ? (parsed as LineaNativeBridgeRecord[])
      : [];

    const pruned = pruneLineaNativeBridgeRecords(records);
    if (pruned !== records) {
      saveLineaNativeBridgeRecords(pruned);
    }

    return pruned;
  } catch {
    return [];
  }
};

export const saveLineaNativeBridgeRecords = (
  records: LineaNativeBridgeRecord[],
) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // The transaction already happened onchain; storage failure must not break UI recovery.
  }
};

export const upsertLineaNativeBridgeRecord = (
  records: LineaNativeBridgeRecord[],
  record: LineaNativeBridgeRecord,
) => {
  const txHash = record.txHash.toLowerCase();
  const withoutRecord = records.filter(
    (item) => item.txHash.toLowerCase() !== txHash,
  );

  return [record, ...withoutRecord];
};
