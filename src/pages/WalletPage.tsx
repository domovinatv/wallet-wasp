import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Address as AddrType } from "viem";
import { getSession } from "../lib/session.js";
import { getTokenBalance } from "../lib/chain.js";
import { fetchActivity, formatAmount, timeAgo, type ActivityItem } from "../lib/activity.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Address as AddressChip } from "../ui/Address.js";

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
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

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

    // Delay activity fetch slightly so the wallet UI paints first.
    // Activity does several RPC calls (logs + block timestamps) so we
    // never want it to gate the balance card.
    const activityTimer = setTimeout(() => {
      void (async () => {
        try {
          const items = await fetchActivity(session.safeAddr as AddrType, 5);
          if (!cancelled) setActivity(items);
        } catch {
          /* silent on home — activity page surfaces errors */
        } finally {
          if (!cancelled) setActivityLoading(false);
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(activityTimer);
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
              <Link
                to="/settings"
                className="rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Postavke
              </Link>
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

        {/* Activity feed (recent) */}
        <div className="mt-4 flex items-center justify-between px-1">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-soft">
            Aktivnost
          </h2>
          <Link
            to="/activity"
            className="text-xs text-brand hover:underline"
            data-testid="activity-cta"
          >
            Sve →
          </Link>
        </div>
        <Card className="mt-2 p-0">
          {activityLoading && (
            <p className="px-5 py-4 text-sm text-ink-soft">učitavam…</p>
          )}
          {!activityLoading && activity.length === 0 && (
            <p
              data-testid="no-activity"
              className="px-5 py-4 text-sm text-ink-soft"
            >
              Još nema transakcija.
            </p>
          )}
          {activity.length > 0 && (
            <ul className="divide-y divide-border">
              {activity.map((item) => (
                <li key={`${item.txHash}-${item.direction}`}>
                  <a
                    href={`${brand.chain.explorerUrl}/tx/${item.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-ink/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {item.direction === "in" ? <ArrowDown /> : <ArrowUp />}
                        <span>{item.direction === "in" ? "Primljeno" : "Poslano"}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {timeAgo(item.timestamp)}
                      </div>
                    </div>
                    <div
                      className={`nums shrink-0 text-sm font-semibold ${item.direction === "in" ? "text-emerald-700" : "text-ink"}`}
                    >
                      {item.direction === "in" ? "+" : "−"}
                      {formatAmount(item.amount)}{" "}
                      <span className="text-xs font-medium text-ink-soft">
                        {brand.token.symbol}
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

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
            <AddressChip value={session.safeAddr} truncate />
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

function ArrowDown() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 text-emerald-700" fill="none">
      <path d="M6 2v8m0 0l3-3m-3 3l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowUp() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 text-ink-muted" fill="none">
      <path d="M6 10V2m0 0L3 5m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
