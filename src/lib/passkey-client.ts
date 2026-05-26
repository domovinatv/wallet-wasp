// Client-side passkey utilities — multi-wallet localStorage registry +
// signWithPasskey for ERC-1271 Safe execTransaction flows.
//
// Architecture: WASP server handles attestation verification + COSE
// pubkey extraction + Safe address derivation (single source of truth).
// AFTER server confirms the credential, the client persists a
// PasskeyRecord locally so subsequent UI flows (Send signing, wallet
// switching, etc.) don't need round-trips.
//
// Storage:
//   wallet_wasp_passkeys_v1  — JSON map keyed by credentialId (lowercased)
//   wallet_wasp_active       — currently-active credentialId

import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyAuthStart } from "wasp/client/operations";
import { brand } from "../brand.config.js";

export type P256PublicKey = { x: bigint; y: bigint };

export interface PasskeyRecord {
  /** WebAuthn credential.id — base64url, normalized to 0x-hex for consistency with on-chain refs. */
  credentialId: string;
  pubKeyX: string; // decimal string of bigint
  pubKeyY: string; // decimal string of bigint
  signerAddress: string;
  safeAddress: string;
  /** Friendly label shown in Keychain (iOS) and the wallet picker. */
  keychainName: string;
  /** RP under which this passkey was created. Stored for cross-TLD lookups. */
  rpId: string;
  createdAt: string; // ISO
  archivedAt?: string; // ISO if soft-deleted
}

const REGISTRY_KEY = "wallet_wasp_passkeys_v1";
const ACTIVE_KEY = "wallet_wasp_active";

function readRegistry(): Record<string, PasskeyRecord> {
  if (typeof localStorage === "undefined") return {};
  const raw = localStorage.getItem(REGISTRY_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(reg: Record<string, PasskeyRecord>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
}

function normalizeCredId(rawId: string): string {
  return rawId.toLowerCase();
}

// --- Registry ops ----------------------------------------------------

export function listKnownPasskeys(): PasskeyRecord[] {
  const reg = readRegistry();
  return Object.values(reg)
    .filter((r) => !r.archivedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listArchivedPasskeys(): PasskeyRecord[] {
  const reg = readRegistry();
  return Object.values(reg)
    .filter((r) => !!r.archivedAt)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
}

export function lookupPasskey(credentialId: string): PasskeyRecord | null {
  const reg = readRegistry();
  return reg[normalizeCredId(credentialId)] ?? null;
}

export function getActivePasskey(): PasskeyRecord | null {
  if (typeof localStorage === "undefined") return null;
  const active = localStorage.getItem(ACTIVE_KEY);
  if (active) {
    const rec = lookupPasskey(active);
    if (rec && !rec.archivedAt) return rec;
  }
  // Fallback: if exactly one active passkey known, treat as active.
  const known = listKnownPasskeys();
  if (known.length === 1) return known[0];
  return null;
}

export function setActivePasskey(credentialId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, normalizeCredId(credentialId));
}

export function clearActivePasskey(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ACTIVE_KEY);
}

export function savePasskey(record: PasskeyRecord): void {
  const reg = readRegistry();
  const key = normalizeCredId(record.credentialId);
  reg[key] = { ...record, credentialId: key };
  writeRegistry(reg);
  setActivePasskey(key);
}

export function archivePasskey(credentialId: string): void {
  const reg = readRegistry();
  const key = normalizeCredId(credentialId);
  const rec = reg[key];
  if (!rec) return;
  reg[key] = { ...rec, archivedAt: new Date().toISOString() };
  writeRegistry(reg);

  // If we just archived the active one, fall back to first remaining
  // active wallet (or clear if none left).
  const activeNow =
    typeof localStorage !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null;
  if (activeNow === key) {
    const remaining = listKnownPasskeys();
    if (remaining.length > 0) {
      setActivePasskey(remaining[0].credentialId);
    } else {
      clearActivePasskey();
    }
  }
}

export function unarchivePasskey(credentialId: string): void {
  const reg = readRegistry();
  const key = normalizeCredId(credentialId);
  const rec = reg[key];
  if (!rec) return;
  reg[key] = { ...rec, archivedAt: undefined } as PasskeyRecord;
  writeRegistry(reg);
}

// --- Naming helpers --------------------------------------------------

const PASSKEY_PURPOSE_SUGGESTIONS = [
  "Glavni",
  "Ušteđevina",
  "Firma",
  "Test",
  "Pokloni",
];

export function purposeToKeychainName(purpose: string): string {
  return `${brand.name} · ${purpose}`;
}

export function suggestPasskeyName(): string {
  // Wallet name shown in Keychain: brand · DD.M.YYYY
  const today = new Date();
  const d = today.getDate();
  const m = today.getMonth() + 1;
  const y = today.getFullYear();
  return `${brand.name} · ${d}.${m}.${y}`;
}

export { PASSKEY_PURPOSE_SUGGESTIONS };

// --- Signing ---------------------------------------------------------

type SignResult = {
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  /** DER-encoded ECDSA P-256 signature. */
  signature: Uint8Array;
};

function b64UrlToBytes(b64url: string): Uint8Array {
  const b64 =
    b64url.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Sign an arbitrary challenge with the currently-active passkey (or with
 * a specific credentialId if provided). For Safe execTransaction signing
 * the challenge IS the safeTxHash — the authenticator signs exactly what
 * we hand it, the server doesn't need to know in advance.
 */
export async function signWithPasskey(
  challenge: Uint8Array,
  credentialId?: string,
): Promise<SignResult> {
  const challengeB64Url = bytesToB64Url(challenge);
  const rpId =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  const optionsJSON: {
    challenge: string;
    timeout: number;
    userVerification: "preferred";
    rpId: string;
    allowCredentials?: Array<{ id: string; type: "public-key" }>;
  } = {
    challenge: challengeB64Url,
    timeout: 60_000,
    userVerification: "preferred",
    rpId,
  };

  if (credentialId) {
    // Strip 0x prefix if present, treat as base64url-compatible.
    optionsJSON.allowCredentials = [
      { id: credentialId.replace(/^0x/, ""), type: "public-key" },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assertion = await startAuthentication({ optionsJSON: optionsJSON as any });

  return {
    authenticatorData: b64UrlToBytes(assertion.response.authenticatorData),
    clientDataJSON: b64UrlToBytes(assertion.response.clientDataJSON),
    signature: b64UrlToBytes(assertion.response.signature),
  };
}

/**
 * OS-level discoverable-credential picker. Used when the user wants to
 * recover a passkey on a fresh device or browser profile.
 */
export async function pickExistingPasskey(): Promise<{ credentialId: string }> {
  const { challenge } = await passkeyAuthStart({});
  // Don't pass allowCredentials — OS picker shows all matching credentials
  // for this RP. User selects one, we get its raw ID back.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assertion = await startAuthentication({
    optionsJSON: {
      challenge,
      timeout: 60_000,
      userVerification: "preferred",
      rpId:
        typeof window !== "undefined"
          ? window.location.hostname
          : "localhost",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });
  return { credentialId: assertion.id };
}

export async function getServerChallenge(): Promise<string> {
  const { challenge } = await passkeyAuthStart({});
  return challenge;
}
