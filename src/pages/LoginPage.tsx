import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyAuthStart, passkeyAuthFinish } from "wasp/client/operations";
import { setSession } from "../lib/session.js";
import {
  lookupPasskey,
  savePasskey,
  setActivePasskey,
  suggestPasskeyName,
} from "../lib/passkey-client.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Button } from "../ui/Button.js";
import { Address } from "../ui/Address.js";

type Status =
  | { kind: "idle" }
  | { kind: "authenticating" }
  | { kind: "done"; userId: string; safeAddr: string }
  | { kind: "error"; message: string };

export function LoginPage() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const navigate = useNavigate();

  async function onLogin() {
    setStatus({ kind: "authenticating" });
    try {
      const { options } = await passkeyAuthStart({});
      // @ts-expect-error options structurally compatible
      const credential = await startAuthentication({ optionsJSON: options });
      const result = await passkeyAuthFinish({ credential });
      setSession({
        userId: result.userId,
        safeAddr: result.safeAddr,
        signerAddr: result.signerAddr,
        pubKeyX: result.pubKeyX,
        pubKeyY: result.pubKeyY,
      });
      // Sync to local multi-wallet registry: if this credentialId is
      // already known, just mark it active; otherwise create a record
      // (cross-device recovery: user signed in here for the first time).
      const existing = lookupPasskey(credential.id);
      if (existing) {
        setActivePasskey(credential.id);
      } else {
        savePasskey({
          credentialId: credential.id,
          pubKeyX: result.pubKeyX,
          pubKeyY: result.pubKeyY,
          signerAddress: result.signerAddr,
          safeAddress: result.safeAddr,
          keychainName: suggestPasskeyName(),
          rpId:
            typeof window !== "undefined"
              ? window.location.hostname
              : "localhost",
          createdAt: new Date().toISOString(),
        });
      }
      setStatus({
        kind: "done",
        userId: result.userId,
        safeAddr: result.safeAddr,
      });
      setTimeout(() => navigate("/wallet"), 700);
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return (
    <Layout back={{ to: "/", label: "Back" }}>
      <div className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-base text-ink-muted">
          Use your passkey to unlock your wallet on this device.
        </p>

        <div className="mt-6">
          <Button
            data-testid="login-button"
            onClick={onLogin}
            loading={status.kind === "authenticating"}
            disabled={status.kind === "done"}
            size="lg"
            fullWidth
          >
            {status.kind === "authenticating"
              ? "Signing in…"
              : status.kind === "done"
                ? "Signed in"
                : "Sign in with passkey"}
          </Button>
        </div>

        {status.kind === "done" && (
          <Card
            data-testid="login-result"
            className="mt-5 bg-brand-50 ring-1 ring-brand/10"
          >
            <p className="text-sm font-semibold text-brand">
              Welcome back — opening your wallet…
            </p>
            <div className="mt-1">
              <Address value={status.safeAddr} />
            </div>
            <p className="mt-2 text-[11px] text-ink-soft" style={{ display: "none" }}>
              <span data-testid="user-id">{status.userId}</span>
              <span data-testid="safe-addr">{status.safeAddr}</span>
            </p>
          </Card>
        )}

        {status.kind === "error" && (
          <Card
            data-testid="login-error"
            className="mt-5 bg-accent-50 ring-1 ring-accent/15"
          >
            <p className="text-sm font-medium text-accent">{status.message}</p>
          </Card>
        )}

        <p className="mt-8 text-sm text-ink-muted">
          No wallet yet?{" "}
          <Link to="/register" className="link-inline font-medium text-brand">
            Create one
          </Link>
        </p>
      </div>
    </Layout>
  );
}
