import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyAuthStart, passkeyAuthFinish } from "wasp/client/operations";
import { setSession } from "../lib/session.js";

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
      // @ts-expect-error  options structurally compatible with PublicKeyCredentialRequestOptionsJSON
      const credential = await startAuthentication({ optionsJSON: options });
      const result = await passkeyAuthFinish({ credential });
      setSession({ userId: result.userId, safeAddr: result.safeAddr });
      setStatus({
        kind: "done",
        userId: result.userId,
        safeAddr: result.safeAddr,
      });
      setTimeout(() => navigate("/wallet"), 600);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Unknown authentication error";
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
      <h1 style={{ fontSize: 24, margin: "0 0 16px" }}>Sign in</h1>
      <p style={{ margin: "0 0 24px", color: "#555" }}>
        Use your passkey to unlock your wallet on this device.
      </p>

      <button
        data-testid="login-button"
        onClick={onLogin}
        disabled={status.kind === "authenticating"}
        style={{
          padding: "12px 20px",
          fontSize: 16,
          borderRadius: 8,
          background: "#1f1f1f",
          color: "white",
          border: "none",
          cursor: status.kind === "authenticating" ? "wait" : "pointer",
        }}
      >
        {status.kind === "authenticating" ? "Signing in..." : "Sign in"}
      </button>

      {status.kind === "done" && (
        <div
          data-testid="login-result"
          style={{ marginTop: 24, padding: 16, background: "#e8f5e9", borderRadius: 8 }}
        >
          <p style={{ margin: "0 0 8px" }}>
            <strong>Signed in.</strong>
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
          data-testid="login-error"
          style={{ marginTop: 24, padding: 16, background: "#ffebee", borderRadius: 8 }}
        >
          <strong>Error:</strong> {status.message}
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 14 }}>
        No wallet yet? <Link to="/register">Create one</Link>
      </p>
    </div>
  );
}
