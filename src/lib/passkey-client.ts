// Client-side passkey utilities — multi-wallet localStorage registry +
// signWithPasskey for ERC-1271 Safe execTransaction flows.
//
// Production wallet (wallet.domovina.ai) has a richer version: v1→v2
// storage migration, RP_ID fallback for cross-TLD recovery, archive,
// createMany guards. Wallet-wasp simplification: each device tracks
// the most recent passkey + its derived Safe via lib/session.ts; the
// SERVER is the source of truth for multi-passkey via Prisma User+Passkey
// rows. Cross-device recovery uses server lookup.

import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyAuthStart } from "wasp/client/operations";

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

/**
 * Get a passkey assertion for a given challenge. We obtain a fresh
 * challenge from the server (passkeyAuthStart), but RESEND it to the
 * authenticator alongside the actual transaction hash so the contract
 * verification can reconstruct clientDataJSON.
 *
 * For Safe execTransaction signing, the challenge IS the safeTxHash —
 * authenticators sign exactly what we give them, the server doesn't
 * need to know in advance.
 */
export async function signWithPasskey(
  challenge: Uint8Array,
): Promise<SignResult> {
  // Build PublicKeyCredentialRequestOptionsJSON manually so we control
  // the challenge (we pass the safeTxHash, not a server-generated one).
  // The server still validates user identity via the session token; this
  // signature is for the on-chain ERC-1271 verifier, not for our backend.
  const challengeB64Url = bytesToB64Url(challenge);

  const optionsJSON = {
    challenge: challengeB64Url,
    timeout: 60_000,
    userVerification: "preferred" as const,
    rpId:
      typeof window !== "undefined"
        ? window.location.hostname
        : "localhost",
  };

  // optionsJSON is structurally compatible with PublicKeyCredentialRequestOptionsJSON
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assertion = await startAuthentication({ optionsJSON: optionsJSON as any });

  return {
    authenticatorData: b64UrlToBytes(
      assertion.response.authenticatorData,
    ),
    clientDataJSON: b64UrlToBytes(assertion.response.clientDataJSON),
    signature: b64UrlToBytes(assertion.response.signature),
  };
}

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Get a fresh challenge from the server, used when the signing path
 * also needs server-side challenge tracking (e.g. login flow). For
 * execTransaction signing, prefer signWithPasskey() with safeTxHash
 * directly as the challenge.
 */
export async function getServerChallenge(): Promise<string> {
  const { challenge } = await passkeyAuthStart({});
  return challenge;
}
