import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { isAddress, parseUnits } from "viem";
import { getSession } from "../lib/session.js";
import { brand } from "../brand.config.js";
import { sendEure } from "wasp/client/operations";
import { parseAmount, isAmountInvalidForDisplay } from "../lib/amount.js";
import {
  addRecipient,
  listRecentRecipients,
  type Recipient,
} from "../lib/recipients.js";
import { humanizeError } from "../lib/errors.js";
import { haptic } from "../lib/haptic.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; txHash: string }
  | { kind: "error"; message: string };

export function SendPage() {
  const session = getSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [toAddr, setToAddr] = useState(params.get("to") ?? "");
  const [amount, setAmount] = useState(params.get("amount") ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [recents, setRecents] = useState<Recipient[]>([]);

  useEffect(() => {
    setRecents(listRecentRecipients(5));
  }, []);

  // Strip deep-link query after consuming, so reload doesn't refresh values
  useEffect(() => {
    if (params.get("to") || params.get("amount")) {
      setParams(new URLSearchParams(), { replace: true });
    }
  }, [params, setParams]);

  if (!session) {
    navigate("/login");
    return null;
  }

  const toReady = isAddress(toAddr);
  const toInvalid = toAddr.length > 0 && !toReady;
  const amountInvalid = isAmountInvalidForDisplay(amount);
  const amountParse = parseAmount(amount);
  const canSubmit =
    toReady && amountParse.ok && status.kind !== "sending";

  const filteredRecents = useMemo(
    () =>
      recents.filter(
        (r) =>
          r.address.toLowerCase() !== toAddr.toLowerCase().trim() &&
          r.address.toLowerCase() !== session.safeAddr.toLowerCase(),
      ),
    [recents, toAddr, session.safeAddr],
  );

  async function onSend() {
    if (!canSubmit || !amountParse.ok) return;
    haptic("tap");
    setStatus({ kind: "sending" });
    try {
      const amountWei = parseUnits(
        amountParse.normalized,
        brand.token.decimals,
      );
      const result = await sendEure({
        from: session!.safeAddr,
        to: toAddr,
        amount: amountWei.toString(),
      });
      addRecipient(toAddr);
      setRecents(listRecentRecipients(5));
      haptic("success");
      setStatus({ kind: "sent", txHash: result.txHash });
    } catch (e) {
      haptic("error");
      setStatus({
        kind: "error",
        message: humanizeError(e, "generic"),
      });
    }
  }

  return (
    <Layout back={{ to: "/wallet", label: "Wallet" }} title="Send">
      <div className="space-y-4 pt-1">
        <Card>
          <div className="space-y-4">
            <Input
              data-testid="to-input"
              label="Recipient address"
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="0x…"
              value={toAddr}
              onChange={(e) => setToAddr(e.target.value.trim())}
              mono
              error={toInvalid ? "Not a valid 0x address" : null}
              hint={
                toReady ? "Looks good." : "Paste a 0x-prefixed Ethereum address."
              }
            />

            {filteredRecents.length > 0 && !toReady && (
              <div data-testid="recipient-chips" className="flex flex-wrap gap-2">
                {filteredRecents.map((r) => (
                  <button
                    key={r.address}
                    type="button"
                    onClick={() => setToAddr(r.address)}
                    className="mono rounded-lg bg-ink/5 px-2 py-1 text-xs text-ink-muted transition hover:bg-ink/10"
                  >
                    {r.label
                      ? `${r.label}: ${r.address.slice(0, 6)}…${r.address.slice(-4)}`
                      : `${r.address.slice(0, 6)}…${r.address.slice(-4)}`}
                  </button>
                ))}
              </div>
            )}

            <Input
              data-testid="amount-input"
              label={`Amount in ${brand.token.symbol}`}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="nums"
              error={
                amountInvalid
                  ? "Unesi pozitivan iznos (npr. 1,50)"
                  : null
              }
            />

            <Button
              data-testid="send-button"
              onClick={onSend}
              disabled={!canSubmit}
              loading={status.kind === "sending"}
              size="lg"
              fullWidth
            >
              {status.kind === "sending"
                ? "Sending…"
                : `Send ${brand.token.symbol}`}
            </Button>
          </div>
        </Card>

        {status.kind === "sent" && (
          <Card
            data-testid="send-success"
            className="bg-brand-50 ring-1 ring-brand/10"
          >
            <div className="flex items-start gap-3">
              <CheckCircle />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand">
                  Transaction submitted
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Track on the explorer once it's mined.
                </p>
                <a
                  href={`${brand.chain.explorerUrl}/tx/${status.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono mt-2 block truncate text-xs text-brand hover:underline"
                >
                  {status.txHash}
                </a>
              </div>
            </div>
          </Card>
        )}

        {status.kind === "error" && (
          <Card
            data-testid="send-error"
            className="bg-accent-50 ring-1 ring-accent/15"
          >
            <p className="text-sm font-medium text-accent">{status.message}</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function CheckCircle() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-brand" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 10.5l2.5 2.5L14 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
