import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { startRegistration } from "@simplewebauthn/browser";
import { passkeyRegisterStart, passkeyRegisterFinish } from "wasp/client/operations";
import { setSession } from "../lib/session.js";
import {
  savePasskey,
  suggestPasskeyName,
} from "../lib/passkey-client.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Button } from "../ui/Button.js";
import { Address } from "../ui/Address.js";

type Status =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "done"; userId: string; safeAddr: string }
  | { kind: "error"; message: string };

export function RegisterPage() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const navigate = useNavigate();

  async function onRegister() {
    setStatus({ kind: "creating" });
    try {
      const { options } = await passkeyRegisterStart({});
      // @ts-expect-error options structurally compatible
      const credential = await startRegistration({ optionsJSON: options });
      const result = await passkeyRegisterFinish({ credential });
      setSession({
        userId: result.userId,
        safeAddr: result.safeAddr,
        signerAddr: result.signerAddr,
        pubKeyX: result.pubKeyX,
        pubKeyY: result.pubKeyY,
      });
      // Multi-wallet registry: persist a PasskeyRecord so the user can
      // switch between this and other wallets on this device, see
      // balances per-wallet, etc. Active is set automatically.
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
        <h1 className="text-2xl font-semibold tracking-tight">Create your wallet</h1>
        <p className="mt-2 text-base text-ink-muted">
          A passkey on this device becomes the only key to your{" "}
          {brand.token.symbol} balance. No email, no password, no seed phrase.
        </p>

        <ol className="mt-6 space-y-2 text-sm text-ink-muted">
          <Step n={1}>You tap the button below.</Step>
          <Step n={2}>Your browser asks for Face ID / Touch ID.</Step>
          <Step n={3}>A {brand.chain.name} Safe is derived from your passkey.</Step>
        </ol>

        <div className="mt-6">
          <Button
            data-testid="register-button"
            onClick={onRegister}
            loading={status.kind === "creating"}
            disabled={status.kind === "done"}
            size="lg"
            fullWidth
          >
            {status.kind === "creating"
              ? "Creating passkey…"
              : status.kind === "done"
                ? "Created"
                : "Create passkey"}
          </Button>
        </div>

        {status.kind === "done" && (
          <Card
            data-testid="register-result"
            className="mt-5 bg-brand-50 ring-1 ring-brand/10"
          >
            <p className="text-sm font-semibold text-brand">
              Wallet created — opening…
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Your Safe address (on {brand.chain.name}):
            </p>
            <div className="mt-1">
              <Address value={status.safeAddr} />
            </div>
            <p className="mt-2 text-[11px] text-ink-soft" data-testid="user-id-hidden" style={{ display: "none" }}>
              <span data-testid="user-id">{status.userId}</span>
              <span data-testid="safe-addr">{status.safeAddr}</span>
            </p>
          </Card>
        )}

        {status.kind === "error" && (
          <Card
            data-testid="register-error"
            className="mt-5 bg-accent-50 ring-1 ring-accent/15"
          >
            <p className="text-sm font-medium text-accent">{status.message}</p>
          </Card>
        )}

        <p className="mt-8 text-sm text-ink-muted">
          Already have a wallet?{" "}
          <Link to="/login" className="link-inline font-medium text-brand">
            Sign in
          </Link>
        </p>
      </div>
    </Layout>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
