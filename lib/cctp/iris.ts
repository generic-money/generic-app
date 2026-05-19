import type { HexAddress } from "@/lib/types/address";

type HexData = `0x${string}`;

export type CctpBridgeRecord = {
  txHash: HexData;
  account: HexAddress;
  amount: string;
  recipient: HexAddress;
  sourceDomain: number;
  destinationDomain: number;
  status: "submitted" | "attested" | "minted";
  message?: HexData;
  attestation?: HexData;
  createdAt: number;
  updatedAt: number;
  finalizedAt?: number;
};

type CctpIrisMessage = {
  message?: HexData;
  attestation?: HexData | "PENDING";
  status?: "complete" | "pending_confirmations" | string;
};

const CCTP_STORAGE_KEY = "generic.cctpBridgeRecords";
const RECORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const loadCctpBridgeRecords = (): CctpBridgeRecord[] => {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CCTP_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CctpBridgeRecord[]) : [];
  } catch {
    return [];
  }
};

export const saveCctpBridgeRecords = (records: CctpBridgeRecord[]) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(CCTP_STORAGE_KEY, JSON.stringify(records));
};

export const pruneCctpBridgeRecords = (
  records: CctpBridgeRecord[],
  now = Date.now(),
) => {
  const pruned = records.filter((record) => {
    if (record.status !== "minted") {
      return true;
    }

    return now - (record.finalizedAt ?? record.updatedAt) < RECORD_TTL_MS;
  });

  return pruned.length === records.length ? records : pruned;
};

export const upsertCctpBridgeRecord = (
  records: CctpBridgeRecord[],
  record: CctpBridgeRecord,
) => {
  const txHash = record.txHash.toLowerCase();
  const withoutRecord = records.filter(
    (item) => item.txHash.toLowerCase() !== txHash,
  );

  return [...withoutRecord, record];
};

export const fetchCctpAttestation = async ({
  txHash,
  sourceDomain,
}: {
  txHash: HexData;
  sourceDomain: number;
}) => {
  const response = await fetch(
    `/api/cctp/messages/${txHash}?sourceDomain=${sourceDomain}`,
    { cache: "no-store" },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`CCTP attestation lookup failed ${response.status}`);
  }

  const payload = (await response.json()) as { messages?: CctpIrisMessage[] };
  const message = payload.messages?.[0];

  if (
    !message ||
    message.status !== "complete" ||
    !message.message ||
    message.message === "0x" ||
    !message.attestation ||
    message.attestation === "PENDING"
  ) {
    return null;
  }

  return {
    message: message.message,
    attestation: message.attestation,
  };
};
