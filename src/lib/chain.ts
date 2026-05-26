import { createPublicClient, http, type Address, formatUnits } from "viem";
import { brand } from "../brand.config.js";

export const publicClient = createPublicClient({
  transport: http(brand.chain.rpcUrl),
});

const ERC20_BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

export async function getTokenBalance(safeAddr: Address): Promise<{
  raw: bigint;
  formatted: string;
}> {
  const raw = await publicClient.readContract({
    address: brand.token.address,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [safeAddr],
  });
  return {
    raw,
    formatted: formatUnits(raw, brand.token.decimals),
  };
}
