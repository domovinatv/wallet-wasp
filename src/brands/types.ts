// BrandConfig shape — flat data-only structure per ADR 0007 (brand-as-data).
// Every src/ file that needs brand-specific values reads from here.
// To add a new tenant: drop a new file under src/brands/ that exports
// `const brand: BrandConfig` and register it in src/brand.config.ts.

export interface BrandConfig {
  // Identity
  id: string;
  name: string;
  shortName: string;
  productSubtitle: string;
  domain: string;
  pageTitle: string;
  homepageUrl: string;
  sourceRepoUrl: string;
  parentRepoUrl: string;
  adrPath: string;
  tagline: string;

  // Visual identity
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;

  // Chain configuration
  chain: {
    id: number;
    name: string;
    rpcUrl: string;
    explorerUrl: string;
    nativeCurrency: { symbol: string; decimals: number };
    multicall3: `0x${string}`;
  };

  // Safe + WebAuthn contracts (chain-specific)
  contracts: {
    safeWebAuthnSignerFactory: `0x${string}`;
    safeWebAuthnSharedSigner: `0x${string}`;
    daimoP256Verifier: `0x${string}`;
    p256Precompile: `0x${string}`;
  };

  // Token to bias the UI around
  token: {
    address: `0x${string}`;
    symbol: string;
    name: string;
    decimals: number;
  };

  // Payment / receive routing
  payment: {
    eip681Scheme: string;
  };

  // Feature flags
  enabledFeatures: ReadonlyArray<
    | "phone-binding"
    | "expand-access"
    | "activity-page"
    | "iframe-sdk"
    | "peer-linking"
  >;
}
