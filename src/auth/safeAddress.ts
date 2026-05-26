import { keccak256, toHex, type Hex } from "viem";

// Phase 1 MVP — deterministic placeholder for the Safe address derived
// from a passkey's P-256 public key. Real Safe v1.4.1 + SafeWebAuthnSignerFactory
// CREATE2 derivation lands in Phase 2 (wallet deploy + send). For now we
// just need a stable, valid-looking 0x address per passkey so the UI can
// render something and the E2E test can assert "the DB row exists".
//
// Returns a 20-byte hex address (`0x` + 40 hex chars).
export function deriveStubSafeAddress(pubkeyBytes: Uint8Array): Hex {
  const hash = keccak256(toHex(pubkeyBytes));
  return ("0x" + hash.slice(-40)) as Hex;
}
