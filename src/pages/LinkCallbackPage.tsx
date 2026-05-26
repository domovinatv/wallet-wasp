import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { consumePendingLink, type PendingLink } from "../lib/linking.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Address as AddressChip } from "../ui/Address.js";

type State =
  | { kind: "parsing" }
  | { kind: "missing-pending" }
  | { kind: "invalid"; reason: string }
  | { kind: "done"; safeAddress: string; txHash: string; pending: PendingLink };

// Safari redirect-path callback: tenant returns here after master's /link
// page completes, with safeAddress + txHash params. Pairs them with the
// sessionStorage stash (PendingLink) to finalize the local registry update.

export function LinkCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: "parsing" });

  useEffect(() => {
    const safeAddress = params.get("safeAddress");
    const txHash = params.get("txHash");

    if (!safeAddress || !txHash) {
      setState({ kind: "invalid", reason: "Nedostaje safeAddress ili txHash." });
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
      setState({ kind: "invalid", reason: "Neispravan safeAddress." });
      return;
    }

    const pending = consumePendingLink();
    if (!pending) {
      setState({ kind: "missing-pending" });
      return;
    }

    setState({ kind: "done", safeAddress, txHash, pending });

    // Auto-navigate home after 1.5s
    const t = setTimeout(() => navigate("/"), 1500);
    return () => clearTimeout(t);
  }, [params, navigate]);

  return (
    <Layout title="Linking complete">
      <div className="space-y-4 pt-1">
        {state.kind === "parsing" && (
          <Card>
            <p className="text-sm text-ink-muted">finaliziram…</p>
          </Card>
        )}

        {state.kind === "missing-pending" && (
          <Card className="bg-accent-50 ring-1 ring-accent/15">
            <p className="text-sm font-semibold text-accent">
              Pending stash je istekao
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Vjerojatno je linking sesija starija od 15 min. Pokušaj ponovno
              iz tenant aplikacije.
            </p>
          </Card>
        )}

        {state.kind === "invalid" && (
          <Card className="bg-accent-50 ring-1 ring-accent/15">
            <p className="text-sm font-semibold text-accent">
              Neispravan callback
            </p>
            <p className="mt-1 text-xs text-ink-muted">{state.reason}</p>
          </Card>
        )}

        {state.kind === "done" && (
          <Card
            data-testid="link-callback-success"
            className="bg-brand-50 ring-1 ring-brand/10"
          >
            <p className="text-sm font-semibold text-brand">
              Linkano — sad ćemo te vratiti na home.
            </p>
            <p className="mt-2 text-xs uppercase tracking-wider text-ink-soft">
              Safe
            </p>
            <div className="mt-1">
              <AddressChip value={state.safeAddress} />
            </div>
            <p className="mt-3 text-xs uppercase tracking-wider text-ink-soft">
              Transaction
            </p>
            <a
              href={`${brand.chain.explorerUrl}/tx/${state.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mono mt-1 block truncate text-xs text-brand hover:underline"
            >
              {state.txHash}
            </a>
          </Card>
        )}
      </div>
    </Layout>
  );
}
