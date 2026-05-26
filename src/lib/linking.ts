import type { Address, Hex } from "viem";
import { brand } from "../brand.config.js";

/**
 * Safari/iOS partitions iframe storage under ITP. We pick the redirect
 * path (vs iframe path) for Safari-likes; postMessage iframe stays in
 * Chrome/Edge/Firefox where third-party WebAuthn iframes work cleanly.
 */
export function isSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg/i.test(ua);
}

export type LinkAuthorizeParams = {
  targetDomain: string;
  newSigner: Address;
  newCredentialId: string;
  newPubKeyX: string;
  newPubKeyY: string;
  newRpId: string;
  newLabel?: string;
  returnMode: "postMessage" | "redirect";
  parentOrigin?: string;
  returnUrl?: string;
};

export function buildLinkAuthorizeUrl(params: LinkAuthorizeParams): string {
  const u = new URL(`https://${params.targetDomain}/link`);
  u.searchParams.set("newSigner", params.newSigner);
  u.searchParams.set("newCredentialId", params.newCredentialId);
  u.searchParams.set("newPubKeyX", params.newPubKeyX);
  u.searchParams.set("newPubKeyY", params.newPubKeyY);
  u.searchParams.set("newRpId", params.newRpId);
  if (params.newLabel) u.searchParams.set("newLabel", params.newLabel);
  u.searchParams.set("returnMode", params.returnMode);
  if (params.parentOrigin)
    u.searchParams.set("parentOrigin", params.parentOrigin);
  if (params.returnUrl) u.searchParams.set("returnUrl", params.returnUrl);
  u.searchParams.set("tenantBrand", brand.name.toLowerCase());
  u.searchParams.set("tenantName", brand.name);
  return u.toString();
}

export type LinkMessage =
  | { type: "link-ready" }
  | { type: "link-result"; safeAddress: Address; txHash: Hex }
  | { type: "link-error"; error: string };

export const LINK_MESSAGE_NAMESPACE = "open-wallet-link";
export type NamespacedLinkMessage = LinkMessage & {
  ns: typeof LINK_MESSAGE_NAMESPACE;
};

export function parseLinkMessage(data: unknown): LinkMessage | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.ns !== LINK_MESSAGE_NAMESPACE) return null;
  if (typeof obj.type !== "string") return null;
  if (obj.type === "link-ready") return { type: "link-ready" };
  if (
    obj.type === "link-result" &&
    typeof obj.safeAddress === "string" &&
    typeof obj.txHash === "string"
  ) {
    return {
      type: "link-result",
      safeAddress: obj.safeAddress as Address,
      txHash: obj.txHash as Hex,
    };
  }
  if (obj.type === "link-error" && typeof obj.error === "string") {
    return { type: "link-error", error: obj.error };
  }
  return null;
}

export function postLinkMessage(
  target: Window,
  msg: LinkMessage,
  origin: string,
): void {
  const payload: NamespacedLinkMessage = {
    ...msg,
    ns: LINK_MESSAGE_NAMESPACE,
  };
  target.postMessage(payload, origin);
}

export type PendingLink = {
  credentialId: string;
  pubKeyX: string;
  pubKeyY: string;
  signerAddress: string;
  keychainName: string;
  rpId: string;
  stashedAt: number;
};

const PENDING_LINK_KEY = "open_wallet_pending_link";
const PENDING_LINK_TTL_MS = 15 * 60 * 1000;

export function stashPendingLink(p: PendingLink): void {
  try {
    sessionStorage.setItem(PENDING_LINK_KEY, JSON.stringify(p));
  } catch (e) {
    console.warn("[linking] sessionStorage stash failed", e);
  }
}

export function consumePendingLink(): PendingLink | null {
  try {
    const raw = sessionStorage.getItem(PENDING_LINK_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_LINK_KEY);
    const parsed = JSON.parse(raw) as PendingLink;
    if (Date.now() - parsed.stashedAt > PENDING_LINK_TTL_MS) {
      console.warn("[linking] pending link expired, discarding");
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn("[linking] sessionStorage consume failed", e);
    return null;
  }
}
