import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Button } from "../ui/Button.js";
import { Address as AddressChip } from "../ui/Address.js";

// Cross-TLD peer authorize page per ADR 0008. A requester wallet
// (different domain) opens this with ?newSigner=...&newCredentialId=...
// query params; the user picks one of their Safes here, signs
// addOwnerWithThreshold(newSigner, 1), and the requester's wallet becomes
// a co-owner of that Safe.
//
// Full implementation requires:
//   1. Real Safe Send infrastructure (RELAYER_PRIVATE_KEY + funded EOA)
//   2. WebAuthn sign client-side with the local passkey
//   3. iframe postMessage OR redirect callback for return signal
//
// Scaffold ready, gated on the same relayer prereq as ExpandAccess.

type Status =
  | { kind: "parsing" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready"; req: LinkRequest }
  | { kind: "not-implemented"; req: LinkRequest };

interface LinkRequest {
  newSigner: string;
  newCredentialId: string;
  newPubKeyX: string;
  newPubKeyY: string;
  newRpId: string;
  tenantName?: string;
  newLabel?: string;
  returnMode: "postMessage" | "redirect";
  parentOrigin?: string;
  returnUrl?: string;
}

function parseRequest(params: URLSearchParams): LinkRequest | null {
  const required = [
    "newSigner",
    "newCredentialId",
    "newPubKeyX",
    "newPubKeyY",
    "newRpId",
  ] as const;
  for (const key of required) {
    if (!params.get(key)) return null;
  }
  const returnMode = params.get("returnMode") as "postMessage" | "redirect";
  if (returnMode !== "postMessage" && returnMode !== "redirect") return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(params.get("newSigner")!)) return null;

  return {
    newSigner: params.get("newSigner")!,
    newCredentialId: params.get("newCredentialId")!,
    newPubKeyX: params.get("newPubKeyX")!,
    newPubKeyY: params.get("newPubKeyY")!,
    newRpId: params.get("newRpId")!,
    tenantName: params.get("tenantName") ?? undefined,
    newLabel: params.get("newLabel") ?? undefined,
    returnMode,
    parentOrigin: params.get("parentOrigin") ?? undefined,
    returnUrl: params.get("returnUrl") ?? undefined,
  };
}

export function LinkPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>({ kind: "parsing" });

  useEffect(() => {
    const req = parseRequest(params);
    if (!req) {
      setStatus({
        kind: "invalid",
        reason: "Nedostaju obavezni parametri ili imaju krivi format.",
      });
      return;
    }
    setStatus({ kind: "ready", req });
  }, [params]);

  return (
    <Layout title="Link wallet">
      <div className="space-y-4 pt-1">
        {status.kind === "parsing" && (
          <Card>
            <p className="text-sm text-ink-muted">učitavam…</p>
          </Card>
        )}

        {status.kind === "invalid" && (
          <Card className="bg-accent-50 ring-1 ring-accent/15">
            <p className="text-sm font-semibold text-accent">Neispravan request</p>
            <p className="mt-1 text-xs text-ink-muted">{status.reason}</p>
          </Card>
        )}

        {(status.kind === "ready" || status.kind === "not-implemented") && (
          <>
            <Card>
              <h2 className="text-base font-semibold">
                Cross-tenant linking
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {status.req.tenantName ?? "Druga wallet aplikacija"} traži
                dozvolu da se njihov passkey doda kao co-owner jednog tvog
                Safe-a. Po uspjehu, isti Safe je dostupan s oba uređaja /
                domena.
              </p>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-wider text-ink-soft">
                Novi signer
              </p>
              <div className="mt-1">
                <AddressChip value={status.req.newSigner} />
              </div>
              <p className="mt-3 text-xs uppercase tracking-wider text-ink-soft">
                Novi credential ID
              </p>
              <code className="mono mt-1 block break-all text-xs text-ink-muted">
                {status.req.newCredentialId}
              </code>
              {status.req.newLabel && (
                <>
                  <p className="mt-3 text-xs uppercase tracking-wider text-ink-soft">
                    Label
                  </p>
                  <p className="mt-1 text-sm">{status.req.newLabel}</p>
                </>
              )}
              <p className="mt-3 text-xs uppercase tracking-wider text-ink-soft">
                RP ID
              </p>
              <p className="mt-1 text-sm">{status.req.newRpId}</p>
            </Card>

            <Card className="bg-amber-50 ring-1 ring-amber-200">
              <p className="text-sm font-semibold text-amber-900">
                Treba relayer + real Send infrastructure
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Da bi addOwner broadcast prošao on-chain, backend treba{" "}
                <code className="mono">RELAYER_PRIVATE_KEY</code> env + funded
                EOA na {brand.chain.name}-u. Trenutno scaffolded UI, ali
                broadcast je gated. Vidi{" "}
                <code className="mono">src/relay/relay.ts</code>.
              </p>
            </Card>

            <Button
              data-testid="link-authorize-button"
              onClick={() =>
                setStatus({
                  kind: "not-implemented",
                  req: status.req,
                })
              }
              disabled={status.kind === "not-implemented"}
              size="lg"
              fullWidth
            >
              Authoriziraj
            </Button>

            {status.kind === "not-implemented" && (
              <Card
                data-testid="link-pending"
                className="bg-brand-50 ring-1 ring-brand/10"
              >
                <p className="text-sm font-semibold text-brand">
                  UI ready, čeka relayer
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Sljedeći korak (kad relayer key postavljen): user picks Safe
                  → WebAuthn sign over getSafeTxHash → relay
                  addOwnerWithThreshold → on success post {status.req.returnMode}{" "}
                  back to tenant.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
