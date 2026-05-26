import type { Address } from "viem";
import { predictSafeAddress, predictSignerAddress } from "../lib/safe.js";
import { coseToP256 } from "./cose.js";

/**
 * Server-side counterfactual Safe address derivation from a verified
 * WebAuthn attestation's COSE public key. Two RPC calls to Gnosis:
 *   1. SafeWebAuthnSignerFactory.getSigner(x, y, verifiers) → signer proxy
 *   2. Safe protocol-kit CREATE2 with [signer] owner, threshold=1, saltNonce=0
 *
 * Both addresses are counterfactual — no deployment occurs until the
 * first execTransaction broadcast (currently relayer-sponsored).
 */
export async function deriveSafeAddressFromCose(coseBytes: Uint8Array): Promise<{
  signerAddress: Address;
  safeAddress: Address;
  pubKey: { x: bigint; y: bigint };
}> {
  const pubKey = coseToP256(coseBytes);
  const signerAddress = await predictSignerAddress(pubKey);
  const safeAddress = await predictSafeAddress(signerAddress);
  return { signerAddress, safeAddress, pubKey };
}
