import { useEffect, useRef, useState } from "react";
import { getSession } from "../lib/session.js";
import { brand } from "../brand.config.js";
import { parseUnits } from "viem";

// Iframe SDK endpoint per ADR 0009. Third-party dApps embed this URL in
// an iframe, communicate via postMessage with a typed protocol. Returns
// connection info (safeAddress) or executes a send on user confirmation.
//
// Production SDK serves wallet.domovina.ai/embed + sdk.js. Here we
// expose the same /embed route with the same postMessage protocol. The
// sdk.js shim is a thin wrapper consumers add to their page; this
// page is the iframe target.

type Command =
  | { type: "connect"; requestId: number; parentOrigin?: string }
  | {
      type: "send";
      requestId: number;
      to: string;
      amountDecimal: string;
      parentOrigin?: string;
    };

type Stage =
  | { kind: "waiting" }
  | { kind: "no-wallet" }
  | {
      kind: "send-confirm";
      cmd: Extract<Command, { type: "send" }>;
      amountWei: bigint;
    }
  | { kind: "sending" }
  | { kind: "success"; title: string; subtitle: string };

export function EmbedPage() {
  const session = getSession();
  const [stage, setStage] = useState<Stage>(() =>
    session ? { kind: "waiting" } : { kind: "no-wallet" },
  );
  const [parentOrigin, setParentOrigin] = useState<string | null>(null);
  const parentOriginRef = useRef<string | null>(null);
  parentOriginRef.current = parentOrigin;

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      const cmd = e.data as Partial<Command> & { type?: string };
      if (cmd.type !== "connect" && cmd.type !== "send") return;
      if (typeof cmd.requestId !== "number") return;

      const origin = e.origin;
      if (!parentOriginRef.current) setParentOrigin(origin);
      // Read fresh session inside handler — not via closure — so the
      // listener stays valid across renders without re-mount.
      const sess = getSession();
      const safeAddr = sess?.safeAddr;

      if (cmd.type === "connect") {
        if (!safeAddr) {
          window.parent.postMessage(
            {
              requestId: cmd.requestId,
              ok: false,
              error: "No wallet on this device",
            },
            origin,
          );
          return;
        }
        window.parent.postMessage(
          {
            requestId: cmd.requestId,
            ok: true,
            result: { safeAddress: safeAddr },
          },
          origin,
        );
        return;
      }

      if (cmd.type === "send") {
        if (!safeAddr || !cmd.to || !cmd.amountDecimal) {
          window.parent.postMessage(
            {
              requestId: cmd.requestId,
              ok: false,
              error: "Missing fields or no wallet",
            },
            origin,
          );
          return;
        }
        try {
          const amountWei = parseUnits(
            cmd.amountDecimal.replace(",", "."),
            brand.token.decimals,
          );
          setStage({
            kind: "send-confirm",
            cmd: cmd as Extract<Command, { type: "send" }>,
            amountWei,
          });
        } catch (err) {
          window.parent.postMessage(
            {
              requestId: cmd.requestId,
              ok: false,
              error: err instanceof Error ? err.message : "Invalid amount",
            },
            origin,
          );
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // Read session via getSession() inside the listener (not as dep) so the
    // listener doesn't re-mount on every render. parentOrigin is captured
    // via setState — read fresh inside handler instead of dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage.kind === "no-wallet") {
    return (
      <div className="mx-auto max-w-sm p-6 text-center">
        <h1 className="text-lg font-semibold">No wallet on this device</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Open{" "}
          <a
            href={brand.sourceRepoUrl.replace(
              /\/wallet-wasp$/,
              "/wallet-wasp",
            )}
            target="_blank"
            rel="noreferrer"
            className="link-inline"
          >
            {brand.name.toLowerCase()} wallet
          </a>{" "}
          to create one first, then return to this dApp.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <header className="mb-4 flex items-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg text-white"
          style={{ background: brand.primaryColor }}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z" />
          </svg>
        </span>
        <span className="text-sm font-medium">{brand.name} wallet</span>
      </header>

      {stage.kind === "waiting" && (
        <p data-testid="embed-waiting" className="text-sm text-ink-muted">
          Waiting for command from parent dApp…
        </p>
      )}

      {stage.kind === "send-confirm" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Confirm send</p>
          <div className="rounded-xl border border-border bg-white p-3 text-sm">
            <div className="text-ink-soft">To</div>
            <code className="mono break-all text-xs">{stage.cmd.to}</code>
            <div className="mt-2 text-ink-soft">Amount</div>
            <div className="nums text-base font-semibold">
              {stage.cmd.amountDecimal} {brand.token.symbol}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid="embed-cancel"
              onClick={() => {
                if (parentOrigin) {
                  window.parent.postMessage(
                    {
                      requestId: stage.cmd.requestId,
                      ok: false,
                      error: "User declined",
                    },
                    parentOrigin,
                  );
                }
                setStage({ kind: "waiting" });
              }}
              className="rounded-xl border border-border bg-white py-2 text-sm"
            >
              Decline
            </button>
            <button
              data-testid="embed-confirm"
              onClick={() => {
                // Real send broadcast gated on RELAYER_PRIVATE_KEY.
                if (parentOrigin) {
                  window.parent.postMessage(
                    {
                      requestId: stage.cmd.requestId,
                      ok: false,
                      error: "RELAYER_PRIVATE_KEY not configured on server",
                    },
                    parentOrigin,
                  );
                }
                setStage({
                  kind: "success",
                  title: "Pending relayer",
                  subtitle:
                    "Set RELAYER_PRIVATE_KEY env on backend to enable real broadcast.",
                });
              }}
              className="rounded-xl bg-brand py-2 text-sm text-white"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {stage.kind === "success" && (
        <div
          data-testid="embed-success"
          className="rounded-xl bg-brand-50 p-3 text-sm ring-1 ring-brand/10"
        >
          <p className="font-semibold text-brand">{stage.title}</p>
          <p className="mt-1 text-xs text-ink-muted">{stage.subtitle}</p>
        </div>
      )}
    </div>
  );
}
