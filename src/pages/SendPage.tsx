import { useState } from "react";
import { useNavigate } from "react-router";
import { isAddress, parseUnits } from "viem";
import { getSession } from "../lib/session.js";
import { brand } from "../brand.config.js";
import { sendEure } from "wasp/client/operations";
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
  const [toAddr, setToAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (!session) {
    navigate("/login");
    return null;
  }

  const toValid = toAddr.length === 0 || isAddress(toAddr);
  const toReady = isAddress(toAddr);
  const amountValid = /^\d+([.,]\d+)?$/.test(amount.trim());
  const canSubmit = toReady && amountValid && status.kind !== "sending";

  async function onSend() {
    if (!canSubmit) return;
    setStatus({ kind: "sending" });
    try {
      const normalizedAmount = amount.replace(",", ".");
      const amountWei = parseUnits(normalizedAmount, brand.token.decimals);
      const result = await sendEure({
        from: session!.safeAddr,
        to: toAddr,
        amount: amountWei.toString(),
      });
      setStatus({ kind: "sent", txHash: result.txHash });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Send failed",
      });
    }
  }

  return (
    <Layout back={{ to: "/wallet", label: "Wallet" }} title="Send">
      <div className="pt-1">
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
              error={!toValid ? "Not a valid 0x address" : null}
              hint={toReady ? "Looks good." : "Paste a 0x-prefixed Ethereum address."}
            />

            <Input
              data-testid="amount-input"
              label={`Amount in ${brand.token.symbol}`}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="nums"
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
            className="mt-4 bg-brand-50 ring-1 ring-brand/10"
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
            className="mt-4 bg-accent-50 ring-1 ring-accent/15"
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
