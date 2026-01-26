import type { HexAddress } from "@/lib/types/address";

type HexHash = `0x${string}`;

export type LzBridgeDirection = "l1-to-citrea" | "citrea-to-l1";

export type LzBridgeRecord = {
  txHash: HexHash;
  account: HexAddress;
  direction: LzBridgeDirection;
  createdAt: number;
  srcEid?: number;
  dstEid?: number;
  status?: string;
  statusMessage?: string;
  guid?: string;
  updatedAt?: number;
};

const STORAGE_KEY = "generic.layerzero.messages";
const SCAN_BASE_URL = "https://scan.layerzero-api.com/v1";
const RECORD_TTL_MS = 10 * 60 * 1000;

const FINAL_STATUSES = new Set([
  "DELIVERED",
  "FAILED",
  "BLOCKED",
  "APPLICATION_BURNED",
  "APPLICATION_SKIPPED",
  "UNRESOLVABLE_COMMAND",
  "MALFORMED_COMMAND",
]);

const normalizeStatus = (status?: string | null) =>
  status ? status.toUpperCase() : undefined;

export const isFinalLzStatus = (status?: string | null) =>
  status ? FINAL_STATUSES.has(normalizeStatus(status) ?? "") : false;

export const pruneLzBridgeRecords = (
  records: LzBridgeRecord[],
  now = Date.now(),
) => {
  const next = records.filter(
    (record) => now - record.createdAt < RECORD_TTL_MS,
  );
  return next.length === records.length ? records : next;
};

export const loadLzBridgeRecords = (): LzBridgeRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as LzBridgeRecord[]) : [];
    const records = Array.isArray(parsed) ? parsed : [];
    const pruned = pruneLzBridgeRecords(records);
    if (pruned.length !== records.length) {
      saveLzBridgeRecords(pruned);
    }
    return pruned;
  } catch {
    return [];
  }
};

export const saveLzBridgeRecords = (records: LzBridgeRecord[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const upsertLzBridgeRecord = (
  records: LzBridgeRecord[],
  record: LzBridgeRecord,
) => {
  const index = records.findIndex(
    (item) => item.txHash.toLowerCase() === record.txHash.toLowerCase(),
  );

  if (index === -1) {
    return [record, ...records];
  }

  const next = [...records];
  next[index] = { ...next[index], ...record };
  return next;
};

const resolveScanUrl = (txHash: HexHash) => {
  if (typeof window !== "undefined") {
    return `/api/layerzero/messages/tx/${txHash}`;
  }

  return `${SCAN_BASE_URL}/messages/tx/${txHash}`;
};

export const fetchLzMessageStatus = async (
  txHash: HexHash,
  expected?: { srcEid?: number; dstEid?: number },
) => {
  const response = await fetch(resolveScanUrl(txHash), {
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return {
        statusName: undefined,
        statusMessage: "Not indexed yet",
        guid: undefined,
      };
    }
    throw new Error(`LayerZero scan error ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: Array<{
      status?: { name?: string; message?: string };
      destination?: { status?: string };
      source?: { status?: string };
      guid?: string;
      pathway?: { srcEid?: number; dstEid?: number };
    }>;
  };

  const messages = Array.isArray(json?.data) ? json.data : [];
  const message =
    expected?.srcEid != null || expected?.dstEid != null
      ? (messages.find((item) => {
          if (expected?.srcEid != null && item.pathway?.srcEid != null) {
            if (item.pathway.srcEid !== expected.srcEid) {
              return false;
            }
          }
          if (expected?.dstEid != null && item.pathway?.dstEid != null) {
            if (item.pathway.dstEid !== expected.dstEid) {
              return false;
            }
          }
          return true;
        }) ?? messages[0])
      : messages[0];
  const statusName = normalizeStatus(
    message?.status?.name ??
      message?.destination?.status ??
      message?.source?.status,
  );

  return {
    statusName,
    statusMessage: message?.status?.message,
    guid: message?.guid,
  };
};
