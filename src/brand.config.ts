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
