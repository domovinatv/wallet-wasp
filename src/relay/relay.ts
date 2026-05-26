import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  encodePacked,
  http,
  isAddress,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { SendEure, GetRelayStatus } from "wasp/server/operations";
import { brand } from "../brand.config.js";
import { gnosis } from "../lib/safe.js";

const FREE_DAILY_LIMIT = 5;

// Safe v1.4.1 canonical deployments on Gnosis (chain 100). Same addresses
// on every major EVM via safe-global/safe-deployments.
const SAFE_PROXY_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67" as const;
const SAFE_SINGLETON = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762" as const;
const COMPATIBILITY_FALLBACK_HANDLER =
  "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99" as const;
const MULTISEND_CALL_ONLY = "0x9641d764fc13c8B624c04430C7356C1C7C8102e2" as const;

const SAFE_EXEC_TX_ABI = [
  {
    inputs: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "bytes", name: "signatures" },
    ],
    name: "execTransaction",
    outputs: [{ type: "bool" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const SAFE_SETUP_ABI = [
  {
    inputs: [
      { type: "address[]", name: "_owners" },
      { type: "uint256", name: "_threshold" },
      { type: "address", name: "to" },
      { type: "bytes", name: "data" },
      { type: "address", name: "fallbackHandler" },
      { type: "address", name: "paymentToken" },
      { type: "uint256", name: "payment" },
      { type: "address", name: "paymentReceiver" },
    ],
    name: "setup",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const PROXY_FACTORY_ABI = [
  {
    inputs: [
      { type: "address", name: "_singleton" },
      { type: "bytes", name: "initializer" },
      { type: "uint256", name: "saltNonce" },
    ],
    name: "createProxyWithNonce",
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const SIGNER_FACTORY_ABI = [
  {
    inputs: [
      { type: "uint256", name: "x" },
      { type: "uint256", name: "y" },
      { type: "uint176", name: "verifiers" },
    ],
    name: "createSigner",
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const MULTISEND_ABI = [
  {
    inputs: [{ type: "bytes", name: "transactions" }],
    name: "multiSend",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONLike = { [key: string]: any };

interface RelayArgs extends JSONLike {
  safeAddress: string;
  signerAddress: string;
  pubKeyX: string;
  pubKeyY: string;
  to: string;
  value: string; // wei
  data: string; // 0x-hex calldata
  signature: string; // 0x-hex Safe contract-sig blob
}

interface RelayResult extends JSONLike {
  ok: boolean;
  txHash?: string;
  deployed?: boolean;
  error?: string;
  rateLimited?: boolean;
}

function encodeVerifiers(): bigint {
  return (
    (BigInt(brand.contracts.p256Precompile) << 160n) |
    BigInt(brand.contracts.daimoP256Verifier)
  );
}

type PackedCall = { to: Address; value: bigint; data: Hex };

/** Pack MultiSendCallOnly transactions: 1 byte op || 20 bytes to || 32 bytes value || 32 bytes dataLen || data. */
function packMultiSend(ops: PackedCall[]): Hex {
  const parts: Hex[] = [];
  for (const op of ops) {
    const dataLen = (op.data.length - 2) / 2;
    parts.push(
      encodePacked(
        ["uint8", "address", "uint256", "uint256", "bytes"],
        [0, op.to, op.value, BigInt(dataLen), op.data as Hex],
      ),
    );
  }
  return ("0x" + parts.map((p) => p.slice(2)).join("")) as Hex;
}

// In-memory rate limit. Production would use Redis or DB; for the dev/Fly.io
// single-replica deployment this is acceptable since the daily counter is
// per-signer and process restarts only widen the window (never tighten it
// against a legitimate user).
const rateCounters = new Map<string, { day: string; count: number }>();

function bumpRate(signerAddress: string): { allowed: boolean; used: number } {
  const today = new Date().toISOString().slice(0, 10);
  const key = signerAddress.toLowerCase();
  const cur = rateCounters.get(key);
  if (!cur || cur.day !== today) {
    rateCounters.set(key, { day: today, count: 1 });
    return { allowed: true, used: 1 };
  }
  if (cur.count >= FREE_DAILY_LIMIT) {
    return { allowed: false, used: cur.count };
  }
  cur.count += 1;
  return { allowed: true, used: cur.count };
}

/**
 * Real Safe broadcast via passkey-signed userOp. The full production
 * relay logic from `wallet/functions/api/relay.ts`, restructured as a
 * WASP action.
 *
 * Pre-flight getCode(safe) is mandatory — see
 * [[feedback-evm-call-to-empty-address]] memory: a call to an undeployed
 * Safe returns status=1 with no logs (~21k gas) instead of reverting,
 * silently losing the user's funds.
 *
 * Gated on RELAYER_PRIVATE_KEY env. If unset, returns ok:false with a
 * clear error so the UI can render the same "needs relayer" banner as
 * before. Once the key is set + the EOA is funded with xDAI, no code
 * changes needed.
 */
export const sendEure: SendEure<RelayArgs, RelayResult> = async (args) => {
  if (
    !isAddress(args.safeAddress) ||
    !isAddress(args.signerAddress) ||
    !isAddress(args.to)
  ) {
    return { ok: false, error: "Invalid address" };
  }
  if (args.safeAddress.toLowerCase() === args.signerAddress.toLowerCase()) {
    return {
      ok: false,
      error: "safeAddress === signerAddress (identity bug — re-open passkey)",
    };
  }
  if (args.pubKeyX === "0" || args.pubKeyY === "0") {
    return {
      ok: false,
      error:
        "Passkey pubkey nije poznat (stub 0). Otvori wallet na uređaju gdje je passkey originalno kreiran, ili kreiraj novi wallet.",
    };
  }

  const { allowed, used } = bumpRate(args.signerAddress);
  if (!allowed) {
    return { ok: false, error: "Daily limit reached", rateLimited: true };
  }

  const rawKey = (process.env.RELAYER_PRIVATE_KEY ?? "").trim();
  if (!rawKey) {
    return {
      ok: false,
      error:
        "RELAYER_PRIVATE_KEY not configured on server. Set in .env.server + fund the EOA with xDAI to enable real broadcast.",
    };
  }
  const normalizedKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    return {
      ok: false,
      error: `RELAYER_PRIVATE_KEY malformed (expected 0x + 64 hex chars, got ${normalizedKey.length} chars)`,
    };
  }

  try {
    const account = privateKeyToAccount(normalizedKey);
    const transport = http(brand.chain.rpcUrl);
    const publicClient = createPublicClient({ chain: gnosis, transport });
    const wallet = createWalletClient({ account, chain: gnosis, transport });

    const safeAddress = args.safeAddress as Address;
    const signerAddress = args.signerAddress as Address;

    const safeCodePre = await publicClient.getCode({ address: safeAddress });
    const safeDeployedPre = !!safeCodePre && safeCodePre !== "0x";

    const execCalldata = encodeFunctionData({
      abi: SAFE_EXEC_TX_ABI,
      functionName: "execTransaction",
      args: [
        args.to as Address,
        BigInt(args.value),
        args.data as Hex,
        0,
        0n,
        0n,
        0n,
        zeroAddress,
        zeroAddress,
        args.signature as Hex,
      ],
    });

    let txHash: Hex | null = null;
    let deployed = false;

    const sendHotPath = async (): Promise<Hex> =>
      await wallet.sendTransaction({ to: safeAddress, data: execCalldata });

    const sendColdPath = async (
      skipSigner: boolean,
      skipSafe: boolean,
    ): Promise<Hex> => {
      const verifiers = encodeVerifiers();
      const ops: PackedCall[] = [];
      if (!skipSigner) {
        ops.push({
          to: brand.contracts.safeWebAuthnSignerFactory,
          value: 0n,
          data: encodeFunctionData({
            abi: SIGNER_FACTORY_ABI,
            functionName: "createSigner",
            args: [BigInt(args.pubKeyX), BigInt(args.pubKeyY), verifiers],
          }),
        });
      }
      if (!skipSafe) {
        const initializer = encodeFunctionData({
          abi: SAFE_SETUP_ABI,
          functionName: "setup",
          args: [
            [signerAddress],
            1n,
            zeroAddress,
            "0x",
            COMPATIBILITY_FALLBACK_HANDLER,
            zeroAddress,
            0n,
            zeroAddress,
          ],
        });
        ops.push({
          to: SAFE_PROXY_FACTORY,
          value: 0n,
          data: encodeFunctionData({
            abi: PROXY_FACTORY_ABI,
            functionName: "createProxyWithNonce",
            args: [SAFE_SINGLETON, initializer, 0n],
          }),
        });
      }
      ops.push({ to: safeAddress, value: 0n, data: execCalldata });

      const multiSendCalldata = encodeFunctionData({
        abi: MULTISEND_ABI,
        functionName: "multiSend",
        args: [packMultiSend(ops)],
      });
      return await wallet.sendTransaction({
        to: MULTISEND_CALL_ONLY,
        data: multiSendCalldata,
      });
    };

    if (!safeDeployedPre) {
      const signerCodePre = await publicClient.getCode({
        address: signerAddress,
      });
      const signerDeployedPre = !!signerCodePre && signerCodePre !== "0x";
      console.warn(
        `[relay] safe undeployed (signer=${signerDeployedPre}); going cold-path to deploy+send atomically`,
      );
      txHash = await sendColdPath(signerDeployedPre, false);
      deployed = true;
    } else {
      let hotErr: unknown = null;
      try {
        txHash = await sendHotPath();
      } catch (e) {
        hotErr = e;
      }
      if (hotErr) {
        const [safeCode2, signerCode2] = await Promise.all([
          publicClient.getCode({ address: safeAddress }),
          publicClient.getCode({ address: signerAddress }),
        ]);
        const safeNow = !!safeCode2 && safeCode2 !== "0x";
        const signerNow = !!signerCode2 && signerCode2 !== "0x";
        if (safeNow && signerNow) throw hotErr;
        console.warn(
          `[relay] hot failed and deployment incomplete (safe=${safeNow}, signer=${signerNow}); routing to cold path`,
        );
        txHash = await sendColdPath(signerNow, safeNow);
        deployed = true;
      }
    }

    if (!txHash) {
      return { ok: false, error: "No transaction submitted" };
    }

    return { ok: true, txHash: String(txHash), deployed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Submit failed: ${msg}` };
  } finally {
    // Note: used counter already bumped — even if broadcast fails, the
    // user has consumed a slot. Matches production semantics.
    void used;
  }
};

interface RelayStatusResult extends JSONLike {
  signerAddress: string;
  used: number;
  remaining: number;
  limit: number;
  resetsAt: string;
  resetsInSec: number;
}

type RelayStatusArgs = JSONLike & { signerAddress: string };

export const getRelayStatus: GetRelayStatus<
  RelayStatusArgs,
  RelayStatusResult
> = async (args: RelayStatusArgs) => {
  const today = new Date().toISOString().slice(0, 10);
  const cur = rateCounters.get(args.signerAddress.toLowerCase());
  const used = cur && cur.day === today ? cur.count : 0;
  const tomorrowUtc = new Date();
  tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
  tomorrowUtc.setUTCHours(0, 0, 0, 0);
  const resetsInSec = Math.max(
    0,
    Math.floor((tomorrowUtc.getTime() - Date.now()) / 1000),
  );
  return {
    signerAddress: args.signerAddress,
    used,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
    limit: FREE_DAILY_LIMIT,
    resetsAt: tomorrowUtc.toISOString(),
    resetsInSec,
  };
};
