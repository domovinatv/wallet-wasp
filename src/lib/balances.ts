import { erc20Abi, formatUnits, type Address } from "viem";
import { brand } from "../brand.config.js";
import { publicClient } from "./safe.js";

/**
 * Batched balance fetch via canonical Multicall3. Single eth_call for N
 * addresses. Missing entries (RPC failures) treated as "loading/unknown",
 * not zero.
 */
export async function fetchEureBalances(
  addresses: readonly Address[],
): Promise<Map<string, bigint>> {
  const out = new Map<string, bigint>();
  if (addresses.length === 0) return out;
  const results = await publicClient.multicall({
    contracts: addresses.map(
      (addr) =>
        ({
          address: brand.token.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [addr],
        }) as const,
    ),
    allowFailure: true,
  });
  results.forEach((r, i) => {
    if (r.status === "success") {
      out.set(addresses[i].toLowerCase(), r.result as bigint);
    }
  });
  return out;
}

/** Wallet picker format: "12.50", "0", "0.001". */
export function formatEureShort(raw: bigint): string {
  if (raw === 0n) return "0";
  const full = formatUnits(raw, brand.token.decimals);
  const num = Number(full);
  if (!Number.isFinite(num)) return full;
  if (num < 0.01) return num.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return num.toFixed(2);
}
