// Brand-as-data per ADR 0010. The only file in src/ allowed to contain
// brand-specific strings, colors, contract addresses, or copy. Everything
// else MUST consume from this config. Goal: `grep -ri "domovina" src/ |
// grep -v brand.config.ts | grep -v copyright` returns empty.
//
// To re-skin for a different brand or chain, edit this file (or load
// from env). No other source file should need touching.

export const brand = {
  // Identity
  name: "DOMOVINA",
  productName: "wallet",
  tagline: "Self-custody EURe wallet powered by passkeys",
  homepageUrl: "https://domovina.ai",
  sourceRepoUrl: "https://github.com/domovinatv/wallet-wasp",
  parentRepoUrl: "https://github.com/domovinatv/pay.domovina.ai",
  adrPath: "/blob/main/docs/decisions/0010-open-wallet-vision.md",

  // Visual identity
  primaryColor: "#002F6C", // DOMOVINA navy
  accentColor: "#FF0000", // Croatian tricolor red
  bgColor: "#fafafa",
  textColor: "#1f1f1f",

  // Chain configuration — switchable by template consumers
  chain: {
    id: 100,
    name: "Gnosis Chain",
    rpcUrl: "https://rpc.gnosischain.com",
    explorerUrl: "https://gnosisscan.io",
    nativeCurrency: { symbol: "xDAI", decimals: 18 },
    multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
  } as const,

  // Safe v1.4.1 + WebAuthn passkey-signer infrastructure. Chain-specific
  // contracts (these addresses are for Gnosis Chain; same Safe versions
  // are deployed at deterministic addresses on most EVM chains).
  contracts: {
    safeWebAuthnSignerFactory:
      "0x1d31F259eE307358a26dFb23EB365939E8641195" as `0x${string}`,
    safeWebAuthnSharedSigner:
      "0x94a4F6affBd8975951142c3999aEAB7ecee555c2" as `0x${string}`,
    daimoP256Verifier:
      "0xc2b78104907F722DABAc4C69f826a522B2754De4" as `0x${string}`,
    p256Precompile:
      "0x0000000000000000000000000000000000000100" as `0x${string}`,
  } as const,

  // Token to bias the UI around (the user's primary "balance")
  token: {
    address: "0xcB444e90D8198415266c6a2724b7900fb12FC56E" as `0x${string}`,
    symbol: "EURe",
    name: "Monerium EURe",
    decimals: 18,
  } as const,

  // Receive-side recipient routing: where payment intents land. For the
  // DOMOVINA tenant, the production wallet uses pay.domovina.ai which
  // routes via Zodiac Roles. For this experiment we just embed the
  // user's own Safe address directly into receive QR codes.
  payment: {
    eip681Scheme: "ethereum",
  } as const,
} as const;

export type Brand = typeof brand;
