// WebAuthn Relying Party config. In dev: localhost / origin http://localhost:4000.
// In prod: this is overridden via env vars so the same code runs across deploys.
//
// rpID must NOT include scheme or port. origin MUST.

const isDev = process.env.NODE_ENV !== "production";

export const RP_ID = process.env.WASP_WEB_RP_ID ?? "localhost";

export const RP_NAME = process.env.WASP_WEB_RP_NAME ?? "wallet-wasp";

export const RP_ORIGIN =
  process.env.WASP_WEB_CLIENT_URL ?? (isDev ? "http://localhost:4000" : "");
