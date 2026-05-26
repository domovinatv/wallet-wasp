import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { getSession, clearSession } from "../lib/session.js";
import { getTokenBalance } from "../lib/chain.js";
import { brand } from "../brand.config.js";
import type { Address } from "viem";

type BalanceState =
  | { kind: "loading" }
  | { kind: "ready"; formatted: string }
  | { kind: "error"; message: string };

export function WalletPage() {
  const session = getSession();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<BalanceState>({ kind: "loading" });

  useEffect(() => {
    if (!session) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await getTokenBalance(session.safeAddr as Address);
        if (!cancelled) {
          setBalance({ kind: "ready", formatted: result.formatted });
        }
      } catch (e) {
        if (!cancelled) {
          setBalance({
            kind: "error",
            message: e instanceof Error ? e.message : "Failed to fetch balance",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{brand.name} wallet</h1>
        <button
          data-testid="signout-button"
          onClick={() => {
            clearSession();
            navigate("/");
          }}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Sign out
        </button>
      </div>

      <div
        data-testid="balance-card"
        className="mb-6 rounded-xl bg-white p-6 shadow-sm"
      >
        <div className="text-sm uppercase tracking-wide text-neutral-500">
          Balance
        </div>
        {balance.kind === "loading" && (
          <div className="mt-2 text-3xl font-semibold tabular-nums text-neutral-300">
            ⋯
          </div>
        )}
        {balance.kind === "ready" && (
          <div
            data-testid="balance-amount"
            className="mt-2 text-3xl font-semibold tabular-nums"
          >
            {balance.formatted}{" "}
            <span className="text-base font-medium text-neutral-500">
              {brand.token.symbol}
            </span>
          </div>
        )}
        {balance.kind === "error" && (
          <div className="mt-2 text-sm text-red-600" data-testid="balance-error">
            {balance.message}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          data-testid="send-cta"
          to="/send"
          className="rounded-xl bg-neutral-900 px-4 py-3 text-center text-white"
        >
          Send
        </Link>
        <Link
          data-testid="receive-cta"
          to="/receive"
          className="rounded-xl border border-neutral-900 px-4 py-3 text-center"
        >
          Receive
        </Link>
      </div>

      <div className="rounded-xl bg-white p-4 text-sm shadow-sm">
        <div className="mb-1 text-neutral-500">Safe address</div>
        <code
          data-testid="safe-addr-full"
          className="break-all font-mono text-xs"
        >
          {session.safeAddr}
        </code>
        <div className="mt-3 text-xs text-neutral-500">
          On {brand.chain.name}.{" "}
          <a
            href={`${brand.chain.explorerUrl}/address/${session.safeAddr}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            View on explorer
          </a>
        </div>
      </div>
    </div>
  );
}
