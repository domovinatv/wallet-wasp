import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { getSession } from "../lib/session.js";
import { brand } from "../brand.config.js";
import { isAddress, parseUnits } from "viem";
import { sendEure } from "wasp/client/operations";

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

  const toValid = isAddress(toAddr);
  const amountValid = /^\d+([.,]\d+)?$/.test(amount.trim());
  const canSubmit = toValid && amountValid && status.kind !== "sending";

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
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/wallet"
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          ← Wallet
        </Link>
        <h1 className="text-2xl font-semibold">Send {brand.token.symbol}</h1>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-500">To address</span>
          <input
            data-testid="to-input"
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="0x…"
            value={toAddr}
            onChange={(e) => setToAddr(e.target.value.trim())}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-neutral-900 focus:outline-none"
          />
          {toAddr.length > 0 && !toValid && (
            <span className="mt-1 block text-xs text-red-600">
              Not a valid 0x address
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-neutral-500">Amount</span>
          <input
            data-testid="amount-input"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 tabular-nums focus:border-neutral-900 focus:outline-none"
          />
        </label>

        <button
          data-testid="send-button"
          onClick={onSend}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-white disabled:bg-neutral-300"
        >
          {status.kind === "sending" ? "Sending..." : `Send ${brand.token.symbol}`}
        </button>

        {status.kind === "sent" && (
          <div
            data-testid="send-success"
            className="rounded-xl bg-green-50 p-4 text-sm"
          >
            <div className="font-semibold text-green-700">Sent</div>
            <a
              href={`${brand.chain.explorerUrl}/tx/${status.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-xs underline"
            >
              {status.txHash}
            </a>
          </div>
        )}

        {status.kind === "error" && (
          <div
            data-testid="send-error"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
