import { getAddress, isAddress, type Address } from "viem";

const STORAGE_KEY = "wallet_wasp_recipients_v1";
const MAX_STORED = 20;

export type Recipient = {
  address: Address;
  lastUsedAt: string;
  count: number;
  label?: string;
};

function read(): Recipient[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Recipient[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r) =>
        r &&
        typeof r.address === "string" &&
        isAddress(r.address) &&
        typeof r.lastUsedAt === "string" &&
        typeof r.count === "number",
    );
  } catch {
    return [];
  }
}

function write(items: Recipient[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED)));
}

export function addRecipient(rawAddress: string, label?: string): void {
  if (!isAddress(rawAddress)) return;
  const address = getAddress(rawAddress);
  const items = read();
  const idx = items.findIndex(
    (r) => r.address.toLowerCase() === address.toLowerCase(),
  );
  const now = new Date().toISOString();
  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      address,
      lastUsedAt: now,
      count: items[idx].count + 1,
      label: label ?? items[idx].label,
    };
  } else {
    items.push({ address, lastUsedAt: now, count: 1, label });
  }
  items.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  write(items);
}

export function listRecentRecipients(limit = 5): Recipient[] {
  return read().slice(0, limit);
}

export function listAllRecipients(): Recipient[] {
  return read();
}

export function removeRecipient(address: Address): void {
  const items = read().filter(
    (r) => r.address.toLowerCase() !== address.toLowerCase(),
  );
  write(items);
}

export function setLabel(rawAddress: string, label: string | null): void {
  if (!isAddress(rawAddress)) return;
  const address = getAddress(rawAddress);
  const items = read();
  const idx = items.findIndex(
    (r) => r.address.toLowerCase() === address.toLowerCase(),
  );
  const trimmed = label?.trim();
  const labelValue = trimmed && trimmed.length > 0 ? trimmed : undefined;
  if (idx >= 0) {
    items[idx] = { ...items[idx], label: labelValue };
  } else {
    items.push({
      address,
      lastUsedAt: new Date().toISOString(),
      count: 0,
      label: labelValue,
    });
    items.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  }
  write(items);
}

export function getLabel(rawAddress: string): string | undefined {
  if (!isAddress(rawAddress)) return undefined;
  const target = rawAddress.toLowerCase();
  return read().find((r) => r.address.toLowerCase() === target)?.label;
}

export function clearRecipients(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
