import type { BrandConfig } from "./types.js";

// Default DOMOVINA Wallet brand — Croatian navy + red palette, Gnosis
// Chain + EURe defaults. Matches the production wallet.domovina.ai look.

const SAFE_GNOSIS = {
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
  safeWebAuthnSignerFactory:
    "0x1d31F259eE307358a26dFb23EB365939E8641195" as `0x${string}`,
  safeWebAuthnSharedSigner:
    "0x94a4F6affBd8975951142c3999aEAB7ecee555c2" as `0x${string}`,
  daimoP256Verifier:
    "0xc2b78104907F722DABAc4C69f826a522B2754De4" as `0x${string}`,
  p256Precompile: "0x0000000000000000000000000000000000000100" as `0x${string}`,
};

const GNOSIS_CHAIN = {
  id: 100,
  name: "Gnosis Chain",
  rpcUrl: "https://rpc.gnosischain.com",
  explorerUrl: "https://gnosisscan.io",
  nativeCurrency: { symbol: "xDAI", decimals: 18 },
  multicall3: SAFE_GNOSIS.multicall3,
};

const EURE = {
  address: "0xcB444e90D8198415266c6a2724b7900fb12FC56E" as `0x${string}`,
  symbol: "EURe",
  name: "Monerium EURe",
  decimals: 18,
};

export const brand: BrandConfig = {
  id: "default",
  name: "DOMOVINA",
  shortName: "DOMOVINA",
  productSubtitle: "Self-custody EURe wallet",
  domain: "wallet.domovina.ai",
  pageTitle: "DOMOVINA Wallet · Self-custody EURe na Gnosisu",
  homepageUrl: "https://domovina.ai",
  sourceRepoUrl: "https://github.com/domovinatv/wallet-wasp",
  parentRepoUrl: "https://github.com/domovinatv/pay.domovina.ai",
  adrPath: "/blob/main/docs/decisions/0010-open-wallet-vision.md",
  tagline: "Self-custody EURe wallet powered by passkeys",

  primaryColor: "#002F6C",
  accentColor: "#FF0000",
  bgColor: "#f5f6f8",
  textColor: "#0f1115",

  chain: GNOSIS_CHAIN,
  contracts: {
    safeWebAuthnSignerFactory: SAFE_GNOSIS.safeWebAuthnSignerFactory,
    safeWebAuthnSharedSigner: SAFE_GNOSIS.safeWebAuthnSharedSigner,
    daimoP256Verifier: SAFE_GNOSIS.daimoP256Verifier,
    p256Precompile: SAFE_GNOSIS.p256Precompile,
  },
  token: EURE,

  payment: {
    eip681Scheme: "ethereum",
  },

  enabledFeatures: [
    "phone-binding",
    "expand-access",
    "activity-page",
    "iframe-sdk",
    "peer-linking",
  ],
};
