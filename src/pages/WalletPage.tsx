import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Address as AddrType } from "viem";
import { getSession, clearSession } from "../lib/session.js";
import { getTokenBalance } from "../lib/chain.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Address } from "../ui/Address.js";

type BalanceState =
  | { kind: "loading" }
  | { kind: "ready"; whole: string; fraction: string }
  | { kind: "error"; message: string };

function splitAmount(formatted: string): { whole: string; fraction: string } {
  const [w, f] = formatted.split(".");
  const padded = (f ?? "00").slice(0, 2).padEnd(2, "0");
  return { whole: w ?? "0", fraction: padded };
}

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
        const result = await getTokenBalance(session.safeAddr as AddrType);
        if (!cancelled) {
          setBalance({ kind: "ready", ...splitAmount(result.formatted) });
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
    <Layout>
      <div className="pt-1">
        {/* Hero balance card */}
        <Card
          data-testid="balance-card"
          className="relative overflow-hidden bg-brand text-white"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-white/70">
                Balance
              </span>
              <button
                data-testid="signout-button"
                onClick={() => {
                  clearSession();
                  navigate("/");
                }}
                className="rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              {balance.kind === "loading" && (
                <span className="text-4xl font-semibold tracking-tight text-white/40">
                  ⋯
                </span>
              )}
              {balance.kind === "ready" && (
                <>
                  <span
                    data-testid="balance-amount"
                    className="nums text-5xl font-semibold tracking-tight"
                  >
                    {balance.whole}
                    <span className="text-white/60">.{balance.fraction}</span>
                  </span>
                  <span className="text-base font-medium text-white/70">
                    {brand.token.symbol}
                  </span>
                </>
              )}
              {balance.kind === "error" && (
                <span
                  data-testid="balance-error"
                  className="text-sm text-accent-50"
                >
                  {balance.message}
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-white/60">
              {brand.token.name} on {brand.chain.name}
            </p>
          </div>
        </Card>

        {/* Action buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            data-testid="send-cta"
            to="/send"
            className="group flex flex-col items-start gap-1 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand transition group-hover:bg-brand-100">
              <ArrowUpRight />
            </span>
            <span className="mt-2 text-sm font-medium">Send</span>
            <span className="text-xs text-ink-soft">To any address</span>
          </Link>

          <Link
            data-testid="receive-cta"
            to="/receive"
            className="group flex flex-col items-start gap-1 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand transition group-hover:bg-brand-100">
              <ArrowDownLeft />
            </span>
            <span className="mt-2 text-sm font-medium">Receive</span>
            <span className="text-xs text-ink-soft">Share QR / address</span>
          </Link>
        </div>

        {/* Safe address strip */}
        <Card className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-ink-soft">
                Safe address
              </div>
              <code
                data-testid="safe-addr-full"
                className="mono mt-1 block truncate text-xs text-ink"
              >
                {session.safeAddr}
              </code>
            </div>
            <Address value={session.safeAddr} truncate />
          </div>
          <a
            href={`${brand.chain.explorerUrl}/address/${session.safeAddr}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            View on {new URL(brand.chain.explorerUrl).hostname}
            <ExternalIcon />
          </a>
        </Card>
      </div>
    </Layout>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path
        d="M5 11l6-6m0 0H5.5m5.5 0v5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownLeft() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path
        d="M11 5l-6 6m0 0h5.5M5 11V5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
      <path
        d="M4.5 2.5h-2v7h7v-2M7 2.5h2.5V5M9 3l-4 4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
