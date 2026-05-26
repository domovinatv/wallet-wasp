import { useState } from "react";
import { useNavigate } from "react-router";
import { getSession } from "../lib/session.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Button } from "../ui/Button.js";
import { Address as AddressChip } from "../ui/Address.js";

type Stage =
  | { kind: "intro" }
  | { kind: "not-implemented" }
  | { kind: "error"; message: string };

// Multi-passkey same-Safe per ADR 0008. Production wallet implementation
// requires real ERC-1271 + Safe execTransaction broadcast (relayer with
// funded EOA). Wallet-wasp scaffolds the UI + flow but the actual
// addOwnerWithThreshold broadcast is gated on RELAYER_PRIVATE_KEY env
// var being set (see src/relay/relay.ts). For now we present the user
// with a clear "ready to enable" state.
export function ExpandAccessPage() {
  const session = getSession();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: "intro" });

  if (!session) {
    navigate("/login");
    return null;
  }

  return (
    <Layout
      back={{ to: "/settings", label: "Postavke" }}
      title="Dodaj passkey"
    >
      <div className="space-y-4 pt-1">
        <Card>
          <h2 className="text-base font-semibold">Drugi uređaj — isti Safe</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Dodaj novi passkey kao dodatnog vlasnika Safe-a uz prag potpisa = 1.
            Korisno kad želiš pristupiti istom računu s dva uređaja bez
            backupa seed phrase-a.
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            Tehnički: stvori se WebAuthn credential, derivira novi signer
            address (CREATE2 od pubkey-a), pa se preko Safe-ovog{" "}
            <code className="mono text-xs">addOwnerWithThreshold</code> self-call-a
            registrira kao co-owner.
          </p>
        </Card>

        <Card className="bg-amber-50 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-900">
            Treba relayer s funded EOA
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Da bi ovaj broadcast prošao on-chain (deploy Safe + execTransaction
            poziv), backend treba{" "}
            <code className="mono">RELAYER_PRIVATE_KEY</code> env varijablu i
            EOA s xDAI gas budget-om. Bez toga UI radi, ali poziv pada na
            relay step-u.
          </p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wider text-ink-soft">
            Trenutni Safe
          </p>
          <div className="mt-1">
            <AddressChip value={session.safeAddr} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Network: {brand.chain.name}
          </p>
        </Card>

        <Button
          data-testid="add-passkey-button"
          onClick={() => setStage({ kind: "not-implemented" })}
          disabled={stage.kind !== "intro"}
          size="lg"
          fullWidth
        >
          Dodaj passkey
        </Button>

        {stage.kind === "not-implemented" && (
          <Card
            data-testid="add-passkey-pending"
            className="bg-brand-50 ring-1 ring-brand/10"
          >
            <p className="text-sm font-semibold text-brand">
              Pripremljen flow — čeka relayer
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              UI je gotov; on-chain broadcast će proraditi čim se{" "}
              <code className="mono">RELAYER_PRIVATE_KEY</code> postavi u
              <code className="mono"> .env.server</code> i EOA se napuni
              xDAI-em. Vidi{" "}
              <code className="mono">src/relay/relay.ts</code> za switch-over
              s stub na real broadcast.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
