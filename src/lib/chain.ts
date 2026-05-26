import { type Address, formatUnits, erc20Abi } from "viem";
import { brand } from "../brand.config.js";
import { publicClient } from "./safe.js";

export { publicClient };

/** Single ERC-20 balance lookup. For wallet-picker batches use balances.ts. */
export async function getTokenBalance(safeAddr: Address): Promise<{
  raw: bigint;
  formatted: string;
}> {
  const raw = await publicClient.readContract({
    address: brand.token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [safeAddr],
  });
  return {
    raw,
    formatted: formatUnits(raw, brand.token.decimals),
  };
}
