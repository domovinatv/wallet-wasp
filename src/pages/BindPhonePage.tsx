import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getSession } from "../lib/session.js";
import {
  otpQrUrl,
  startOtpVerification,
  subscribeOtp,
  type OtpPollResponse,
  type OtpStartResponse,
} from "../lib/otp.js";
import { humanizeError } from "../lib/errors.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Button } from "../ui/Button.js";

type Stage =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "sms-sent"; start: OtpStartResponse }
  | { kind: "verified"; phone: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

// Phone OTP binding per ADR 0003 (Phase 4 prereq for Phase 5 attestation).
// Hits otp.domovina.ai (or VITE_OTP_BASE) directly — production service is
// CORS-permissive. Server-side binding to a wallet would still need a
// registry proxy; for now this scaffold demonstrates the OTP ceremony and
// is honest about the persistence gap.

export function BindPhonePage() {
  const session = getSession();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!session) navigate("/login");
    return () => {
      cancelRef.current?.();
    };
  }, [session, navigate]);

  async function onStart() {
    setStage({ kind: "starting" });
    try {
      const start = await startOtpVerification("wallet_bind_phone");
      setStage({ kind: "sms-sent", start });

      cancelRef.current = subscribeOtp(start.id, (v: OtpPollResponse) => {
        if (v.status === "verified" && v.verified_phone) {
          setStage({ kind: "verified", phone: v.verified_phone });
          cancelRef.current?.();
        } else if (v.status === "expired") {
          setStage({ kind: "expired" });
          cancelRef.current?.();
        }
      });
    } catch (e) {
      setStage({ kind: "error", message: humanizeError(e, "generic") });
    }
  }

  if (!session) return null;

  return (
    <Layout
      back={{ to: "/settings", label: "Postavke" }}
      title="Poveži telefon"
    >
      <div className="space-y-4 pt-1">
        <Card>
          <h2 className="text-base font-semibold">Phone OTP binding</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Veži broj telefona uz wallet kao recovery + sybil-resistance
            mehanizam. Servis: <code className="mono">otp.domovina.ai</code>{" "}
            (reverse-OTP — ti pošalješ SMS, ne mi). Telefon se hashira s
            peppered SHA-256, ne sprema u plain.
          </p>
        </Card>

        <Card className="bg-amber-50 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-900">
            Server-side binding scaffolded
          </p>
          <p className="mt-1 text-xs text-amber-800">
            OTP ceremony se izvršava protiv otp.domovina.ai live API-ja. Da
            binding persistira (Settings prikaže "telefon povezan"), treba
            WASP backend proxy prema mpt.domovina.ai/api/wallets/.../bind-phone
            ili integrirati Phase 5 SBT contract. Vidi ADR 0003.
          </p>
        </Card>

        {stage.kind === "idle" && (
          <Button
            data-testid="bind-phone-button"
            onClick={onStart}
            size="lg"
            fullWidth
          >
            Pošalji SMS s kodom
          </Button>
        )}

        {stage.kind === "starting" && (
          <Card>
            <p className="text-sm text-ink-muted">priprema se…</p>
          </Card>
        )}

        {stage.kind === "sms-sent" && (
          <>
            <Card data-testid="sms-instructions">
              <p className="text-sm font-semibold">Pošalji SMS s ovog uređaja</p>
              <p className="mt-2 text-sm text-ink-muted">
                Pošalji riječ{" "}
                <code className="mono rounded bg-ink/5 px-1.5 py-0.5">
                  {stage.start.code}
                </code>{" "}
                na broj{" "}
                <a
                  href={`sms:${stage.start.gateway_number}?body=${encodeURIComponent(stage.start.code)}`}
                  className="link-inline font-medium"
                >
                  {stage.start.gateway_number}
                </a>
                .
              </p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">…ili sa drugog uređaja</p>
              <p className="mt-2 text-sm text-ink-muted">
                Skeniraj QR mobitelom da otvoriš SMS app pre-filled.
              </p>
              <div className="mt-3 flex justify-center rounded-2xl bg-white p-3 ring-1 ring-border">
                <img
                  data-testid="sms-qr"
                  src={otpQrUrl(stage.start.id)}
                  alt="OTP QR"
                  width={240}
                  height={240}
                />
              </div>
            </Card>
          </>
        )}

        {stage.kind === "verified" && (
          <Card
            data-testid="bind-phone-success"
            className="bg-brand-50 ring-1 ring-brand/10"
          >
            <p className="text-sm font-semibold text-brand">Telefon verificiran</p>
            <p className="mt-1 text-sm text-ink-muted">
              Broj: <code className="mono">{stage.phone}</code>
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              Persisting na wallet registry traži backend proxy (vidi gore).
            </p>
          </Card>
        )}

        {stage.kind === "expired" && (
          <Card className="bg-accent-50 ring-1 ring-accent/15">
            <p className="text-sm font-semibold text-accent">OTP istekao</p>
            <p className="mt-1 text-xs text-ink-muted">
              Probaj ponovno (svaki OTP traje ~10 min).
            </p>
          </Card>
        )}

        {stage.kind === "error" && (
          <Card className="bg-accent-50 ring-1 ring-accent/15">
            <p className="text-sm font-medium text-accent">{stage.message}</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
