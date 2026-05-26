import {
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
} from "viem";
import { brand } from "../brand.config.js";

export type DecodedQR =
  | {
      kind: "eure-gnosis";
      recipient: Address;
      amountDecimal: string | null;
    }
  | {
      kind: "address-only";
      recipient: Address;
    }
  | {
      kind: "unsupported";
      reason: string;
    };

export function encodeEureTransferUri(opts: {
  recipient: Address;
  amountDecimal?: string;
}): string {
  const params: string[] = [`address=${opts.recipient}`];
  if (opts.amountDecimal && opts.amountDecimal.length > 0) {
    const wei = parseUnits(opts.amountDecimal, brand.token.decimals);
    params.push(`uint256=${wei.toString()}`);
  }
  return `ethereum:${brand.token.address}@${brand.chain.id}/transfer?${params.join("&")}`;
}

export function decodeQR(raw: string): DecodedQR {
  const text = raw.trim();
  if (!text) return { kind: "unsupported", reason: "Prazan QR" };

  if (/^0x[a-fA-F0-9]{40}$/.test(text)) {
    return { kind: "address-only", recipient: getAddress(text) };
  }

  if (!text.toLowerCase().startsWith("ethereum:")) {
    return { kind: "unsupported", reason: "QR nije Ethereum / EIP-681 format" };
  }

  const body = text.slice("ethereum:".length);
  const [pathPart, queryPart = ""] = body.split("?");
  const fnSplit = pathPart.split("/");
  const target = fnSplit[0];
  const fn = fnSplit[1];
  const [targetAddr, chainStr] = target.split("@");
  const chainId = chainStr ? Number(chainStr) : undefined;

  if (!isAddress(targetAddr)) {
    return { kind: "unsupported", reason: "Adresa u QR-u nije valjana" };
  }
  const target_ = getAddress(targetAddr);

  if (!fn) {
    if (chainId !== undefined && chainId !== brand.chain.id) {
      return {
        kind: "unsupported",
        reason: `QR je za chain ${chainId}, ne ${brand.chain.name}`,
      };
    }
    return { kind: "address-only", recipient: target_ };
  }

  if (fn !== "transfer") {
    return { kind: "unsupported", reason: `Nepoznata funkcija "${fn}"` };
  }
  if (chainId !== undefined && chainId !== brand.chain.id) {
    return {
      kind: "unsupported",
      reason: `QR je za chain ${chainId}, ne ${brand.chain.name}`,
    };
  }
  if (target_.toLowerCase() !== brand.token.address.toLowerCase()) {
    return {
      kind: "unsupported",
      reason: `QR ne šalje ${brand.token.symbol} (drugi token)`,
    };
  }

  const params = new URLSearchParams(queryPart);
  const toRaw = params.get("address");
  if (!toRaw || !isAddress(toRaw)) {
    return { kind: "unsupported", reason: "Nedostaje recipient adresa" };
  }
  const recipient = getAddress(toRaw);

  const valueRaw = params.get("uint256") ?? params.get("value");
  let amountDecimal: string | null = null;
  if (valueRaw) {
    try {
      const wei = BigInt(valueRaw);
      amountDecimal = formatUnits(wei, brand.token.decimals);
    } catch {
      /* skip amount */
    }
  }

  return { kind: "eure-gnosis", recipient, amountDecimal };
}
