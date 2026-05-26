import Safe from "@safe-global/protocol-kit";
import {
  createPublicClient,
  defineChain,
  hashTypedData,
  http,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import {
  encodeSafeContractSignature,
  encodeWebAuthnSignerSignature,
} from "./webauthnSig.js";
import { brand } from "../brand.config.js";

export type P256PublicKey = { x: bigint; y: bigint };

export const gnosis = defineChain({
  id: brand.chain.id,
  name: brand.chain.name,
  nativeCurrency: {
    name: brand.chain.nativeCurrency.symbol,
    symbol: brand.chain.nativeCurrency.symbol,
    decimals: brand.chain.nativeCurrency.decimals,
  },
  rpcUrls: { default: { http: [brand.chain.rpcUrl] } },
  blockExplorers: {
    default: { name: "Explorer", url: brand.chain.explorerUrl },
  },
  contracts: {
    multicall3: { address: brand.chain.multicall3 },
  },
});

export const publicClient = createPublicClient({
  chain: gnosis,
  transport: http(),
});

/**
 * (precompile_address << 160 | fallback_verifier) into the uint176 expected by
 * SafeWebAuthnSignerFactory. The factory tries the precompile first
 * (RIP-7212 on chains that support it), falls back to the Daimo verifier.
 */
export function encodeVerifiers(): bigint {
  return (
    (BigInt(brand.contracts.p256Precompile) << 160n) |
    BigInt(brand.contracts.daimoP256Verifier)
  );
}

const SAFE_WEBAUTHN_SIGNER_FACTORY_ABI = [
  {
    inputs: [
      { name: "x", type: "uint256" },
      { name: "y", type: "uint256" },
      { name: "verifiers", type: "uint176" },
    ],
    name: "getSigner",
    outputs: [{ name: "signer", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Counterfactual WebAuthnSigner proxy address for a passkey pubkey.
 * View call on the factory — no deployment.
 */
export async function predictSignerAddress(
  pubKey: P256PublicKey,
): Promise<Address> {
  return publicClient.readContract({
    address: brand.contracts.safeWebAuthnSignerFactory,
    abi: SAFE_WEBAUTHN_SIGNER_FACTORY_ABI,
    functionName: "getSigner",
    args: [pubKey.x, pubKey.y, encodeVerifiers()],
  });
}

/**
 * Counterfactual Safe 1/1 address with signerAddress as the only owner.
 * Safe protocol-kit performs deterministic CREATE2. No deploy.
 */
export async function predictSafeAddress(
  signerAddress: Address,
): Promise<Address> {
  const protocolKit = await Safe.init({
    provider: brand.chain.rpcUrl,
    predictedSafe: {
      safeAccountConfig: {
        owners: [signerAddress],
        threshold: 1,
      },
      safeDeploymentConfig: {
        saltNonce: "0",
        safeVersion: "1.4.1",
      },
    },
  });
  return (await protocolKit.getAddress()) as Address;
}

const SAFE_NONCE_ABI = [
  {
    inputs: [],
    name: "nonce",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const SAFE_TX_TYPES = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export type SafeTxFields = {
  to: Address;
  value: bigint;
  data: Hex;
  operation: 0 | 1;
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: Address;
  refundReceiver: Address;
  nonce: bigint;
};

/**
 * Current nonce of a Safe. If not yet deployed (counterfactual), returns 0n —
 * the value that will apply when the first execTransaction bundles the deploy.
 */
export async function readSafeNonce(safeAddress: Address): Promise<bigint> {
  const code = await publicClient.getCode({ address: safeAddress });
  if (!code || code === "0x") return 0n;
  return publicClient.readContract({
    address: safeAddress,
    abi: SAFE_NONCE_ABI,
    functionName: "nonce",
  });
}

/**
 * EIP-712 `SafeTx` hash that will be signed by the passkey. Safe v1.4.1
 * domain = `{ chainId, verifyingContract }`. Gas-refund fields all zero
 * (relayer absorbs gas out-of-band; we don't use Safe's built-in refund
 * mechanism).
 */
export async function getSafeTxHash(
  safeAddress: Address,
  tx: {
    to: Address;
    value: bigint;
    data: Hex;
    operation?: 0 | 1;
    nonce?: bigint;
  },
): Promise<{ hash: Hex; fields: SafeTxFields }> {
  const nonce = tx.nonce ?? (await readSafeNonce(safeAddress));

  const fields: SafeTxFields = {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    operation: tx.operation ?? 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: zeroAddress,
    refundReceiver: zeroAddress,
    nonce,
  };

  const hash = hashTypedData({
    domain: {
      chainId: brand.chain.id,
      verifyingContract: safeAddress,
    },
    types: SAFE_TX_TYPES,
    primaryType: "SafeTx",
    message: fields,
  });

  return { hash, fields };
}

/**
 * Wrap a raw WebAuthn assertion into the full Safe `signatures` blob for
 * execTransaction. Composes WebAuthn singleton payload with Safe's ERC-1271
 * contract-signature framing.
 */
export function encodeWebAuthnSignature(args: {
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  signature: Uint8Array;
  signerAddress: Address;
}): Hex {
  const innerSig = encodeWebAuthnSignerSignature({
    authenticatorData: args.authenticatorData,
    clientDataJSON: args.clientDataJSON,
    derSignature: args.signature,
  });
  return encodeSafeContractSignature(args.signerAddress, innerSig);
}
