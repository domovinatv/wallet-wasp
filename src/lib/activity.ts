import { formatUnits, parseAbiItem, type Address, type Log } from "viem";
import { brand } from "../brand.config.js";
import { publicClient } from "./safe.js";

export type ActivityItem = {
  txHash: `0x${string}`;
  direction: "in" | "out";
  counterparty: Address;
  amount: string;
  blockNumber: bigint;
  timestamp: number;
};

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

// Gnosis ~17 blocks/min (~5s). 200k blocks ≈ 8.2 days per page.
export const ACTIVITY_PAGE_BLOCK_RANGE = 200_000n;

type TransferLog = Log<bigint, number, false, typeof TRANSFER_EVENT, true>;

/**
 * EURe transfers touching `safeAddress` within an explicit block range,
 * timestamps resolved. Sorted blockNumber desc. Two indexed-topic queries
 * (from + to), self-transfers deduped.
 */
export async function fetchActivityRange(
  safeAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<ActivityItem[]> {
  if (fromBlock > toBlock) return [];

  const [outgoing, incoming] = await Promise.all([
    publicClient.getLogs({
      address: brand.token.address,
      event: TRANSFER_EVENT,
      args: { from: safeAddress },
      fromBlock,
      toBlock,
    }) as Promise<TransferLog[]>,
    publicClient.getLogs({
      address: brand.token.address,
      event: TRANSFER_EVENT,
      args: { to: safeAddress },
      fromBlock,
      toBlock,
    }) as Promise<TransferLog[]>,
  ]);

  const merged: ActivityItem[] = [];
  for (const log of outgoing) {
    if (!log.args.to || log.args.value === undefined) continue;
    merged.push({
      txHash: log.transactionHash!,
      direction: "out",
      counterparty: log.args.to,
      amount: formatUnits(log.args.value, brand.token.decimals),
      blockNumber: log.blockNumber!,
      timestamp: 0,
    });
  }
  for (const log of incoming) {
    if (!log.args.from || log.args.value === undefined) continue;
    if (log.args.from.toLowerCase() === safeAddress.toLowerCase()) continue;
    merged.push({
      txHash: log.transactionHash!,
      direction: "in",
      counterparty: log.args.from,
      amount: formatUnits(log.args.value, brand.token.decimals),
      blockNumber: log.blockNumber!,
      timestamp: 0,
    });
  }

  merged.sort((a, b) => Number(b.blockNumber - a.blockNumber));

  const uniqueBlocks = Array.from(new Set(merged.map((i) => i.blockNumber)));
  const blockTimestamps = new Map<bigint, number>();
  await Promise.all(
    uniqueBlocks.map(async (bn) => {
      try {
        const block = await publicClient.getBlock({ blockNumber: bn });
        blockTimestamps.set(bn, Number(block.timestamp));
      } catch {
        /* ignore */
      }
    }),
  );
  for (const item of merged) {
    item.timestamp = blockTimestamps.get(item.blockNumber) ?? 0;
  }

  return merged;
}

export async function fetchActivity(
  safeAddress: Address,
  limit = 20,
): Promise<ActivityItem[]> {
  const latest = await publicClient.getBlockNumber();
  const fromBlock =
    latest > ACTIVITY_PAGE_BLOCK_RANGE ? latest - ACTIVITY_PAGE_BLOCK_RANGE : 0n;
  const items = await fetchActivityRange(safeAddress, fromBlock, latest);
  return items.slice(0, limit);
}

export function formatAmount(decimalStr: string): string {
  const n = Number(decimalStr);
  if (!isFinite(n)) return decimalStr;
  return n.toLocaleString("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 0.01 ? 6 : 2,
  });
}

export function timeAgo(unixSeconds: number, nowMs: number = Date.now()): string {
  if (!unixSeconds) return "";
  const deltaSec = Math.max(0, Math.floor(nowMs / 1000) - unixSeconds);
  if (deltaSec < 60) return "sad";
  if (deltaSec < 3600) return `prije ${Math.floor(deltaSec / 60)} min`;
  if (deltaSec < 86400) return `prije ${Math.floor(deltaSec / 3600)} h`;
  if (deltaSec < 7 * 86400) return `prije ${Math.floor(deltaSec / 86400)} d`;
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export function dayLabel(unixSeconds: number, nowMs: number = Date.now()): string {
  if (!unixSeconds) return "Nepoznat datum";
  const d = new Date(unixSeconds * 1000);
  const now = new Date(nowMs);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, now)) return "Danas";
  const yesterday = new Date(nowMs - 86_400_000);
  if (sameDay(d, yesterday)) return "Jučer";
  return d.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
