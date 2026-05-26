import { useState } from "react";
import { Link } from "react-router";
import { startRegistration } from "@simplewebauthn/browser";
import { passkeyRegisterStart, passkeyRegisterFinish } from "wasp/client/operations";

type Status =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "done"; userId: string; safeAddr: string }
  | { kind: "error"; message: string };

export function RegisterPage() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onRegister() {
    setStatus({ kind: "creating" });
    try {
      const { options } = await passkeyRegisterStart({});
      // @ts-expect-error  options is structurally compatible with PublicKeyCredentialCreationOptionsJSON
      const credential = await startRegistration({ optionsJSON: options });
      const result = await passkeyRegisterFinish({ credential });
      setStatus({
        kind: "done",
        userId: result.userId,
        safeAddr: result.safeAddr,
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Unknown error during registration";
      setStatus({ kind: "error", message });
    }
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "48px 24px",
        lineHeight: 1.55,
      }}
    >
      <h1 style={{ fontSize: 24, margin: "0 0 16px" }}>Create wallet</h1>
      <p style={{ margin: "0 0 24px", color: "#555" }}>
        A passkey on this device will be the only key to your wallet.
        No email, no password, no seed phrase.
      </p>

      <button
        data-testid="register-button"
        onClick={onRegister}
        disabled={status.kind === "creating"}
        style={{
          padding: "12px 20px",
          fontSize: 16,
          borderRadius: 8,
          background: "#1f1f1f",
          color: "white",
          border: "none",
          cursor: status.kind === "creating" ? "wait" : "pointer",
        }}
      >
        {status.kind === "creating" ? "Creating passkey..." : "Create passkey"}
      </button>

      {status.kind === "done" && (
        <div
          data-testid="register-result"
          style={{ marginTop: 24, padding: 16, background: "#e8f5e9", borderRadius: 8 }}
        >
          <p style={{ margin: "0 0 8px" }}>
            <strong>Wallet created.</strong>
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            User ID: <code data-testid="user-id">{status.userId}</code>
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            Safe address: <code data-testid="safe-addr">{status.safeAddr}</code>
          </p>
        </div>
      )}

      {status.kind === "error" && (
        <div
          data-testid="register-error"
          style={{ marginTop: 24, padding: 16, background: "#ffebee", borderRadius: 8 }}
        >
          <strong>Error:</strong> {status.message}
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 14 }}>
        Already have a wallet? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
