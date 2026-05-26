// Brand-as-data per ADR 0010. Single re-export point for the active
// tenant config. Switch tenants by setting VITE_BRAND in the build env:
//
//   VITE_BRAND=default    npm run build  →  DOMOVINA Wallet
//   VITE_BRAND=sportklub  npm run build  →  SK Wallet
//   VITE_BRAND=zupa       npm run build  →  Župa Wallet
//
// No other src/ file should hard-code brand strings, colors, contracts,
// or chain config — everything goes through `brand` exported here.
// To add a new tenant: drop a new file under src/brands/ and register
// it in REGISTRY below.

import type { BrandConfig } from "./brands/types.js";
import { brand as defaultBrand } from "./brands/default.js";
import { brand as sportklubBrand } from "./brands/sportklub.js";
import { brand as zupaBrand } from "./brands/zupa.js";

const REGISTRY: Record<string, BrandConfig> = {
  default: defaultBrand,
  sportklub: sportklubBrand,
  zupa: zupaBrand,
};

function resolveActiveBrand(): BrandConfig {
  // Vite injects build-time env on both client and server when prefixed
  // with VITE_. On server-side WASP actions, fall back to process.env so
  // CREATE2 derivation in passkeyRegisterFinish uses the right chain.
  const fromVite =
    typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_BRAND?: string } }).env?.VITE_BRAND;
  const fromProcess =
    typeof process !== "undefined" && process.env?.VITE_BRAND;
  const id = fromVite || fromProcess || "default";
  return REGISTRY[id] ?? defaultBrand;
}

export const brand: BrandConfig = resolveActiveBrand();
export type { BrandConfig };

/**
 * Returns the list of brands available for cross-TLD peer linking
 * (per ADR 0008). For the open-wallet template we surface all
 * registered tenants OTHER than the currently-active one — those are
 * the peers a user could authorize a wallet on from this tenant.
 */
export function getLinkTargets(): BrandConfig[] {
  return Object.values(REGISTRY).filter((b) => b.id !== brand.id);
}

/**
 * Convenience check for feature flags from brand.enabledFeatures.
 * Lets routes hide UI when the active brand has opted out of a feature.
 */
export function isFeatureEnabled(
  feature: BrandConfig["enabledFeatures"][number],
): boolean {
  return brand.enabledFeatures.includes(feature);
}
