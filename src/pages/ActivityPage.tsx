import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Address } from "viem";
import { getSession } from "../lib/session.js";
import {
  ACTIVITY_PAGE_BLOCK_RANGE,
  dayLabel,
  fetchActivityRange,
  formatAmount,
  timeAgo,
  type ActivityItem,
} from "../lib/activity.js";
import { publicClient } from "../lib/safe.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Address as AddressChip } from "../ui/Address.js";

export function ActivityPage() {
  const session = getSession();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [cursorBlock, setCursorBlock] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) navigate("/login");
  }, [session, navigate]);

  // Initial page
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const from =
          latest > ACTIVITY_PAGE_BLOCK_RANGE
            ? latest - ACTIVITY_PAGE_BLOCK_RANGE
            : 0n;
        const page = await fetchActivityRange(
          session.safeAddr as Address,
          from,
          latest,
        );
        if (cancelled) return;
        setItems(page);
        setCursorBlock(from > 0n ? from - 1n : null);
        if (from === 0n) setDone(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Greška");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Infinite scroll
  useEffect(() => {
    if (done || loading || cursorBlock === null) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting) return;
        if (!session || cursorBlock === null) return;
        setLoading(true);
        try {
          const from =
            cursorBlock > ACTIVITY_PAGE_BLOCK_RANGE
              ? cursorBlock - ACTIVITY_PAGE_BLOCK_RANGE
              : 0n;
          const page = await fetchActivityRange(
            session.safeAddr as Address,
            from,
            cursorBlock,
          );
          setItems((prev) => [...prev, ...page]);
          if (from === 0n) {
            setDone(true);
            setCursorBlock(null);
          } else {
            setCursorBlock(from - 1n);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Greška");
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursorBlock, done, loading, session]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const item of items) {
      const key = dayLabel(item.timestamp);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [items]);

  if (!session) return null;

  return (
    <Layout back={{ to: "/wallet", label: "Wallet" }} title="Aktivnost">
      <div className="space-y-4 pt-1">
        {!loading && items.length === 0 && (
          <Card>
            <p className="text-sm text-ink-muted">
              Još nema transakcija na ovom Safe-u.
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              Kad netko pošalje {brand.token.symbol} na tvoj Safe address, ovdje
              će se pojaviti unos.
            </p>
          </Card>
        )}

        {grouped.map(([dayKey, dayItems]) => (
          <div key={dayKey}>
            <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-ink-soft">
              {dayKey}
            </h2>
            <Card className="divide-y divide-border p-0">
              {dayItems.map((item) => (
                <ActivityRow key={`${item.txHash}-${item.direction}`} item={item} />
              ))}
            </Card>
          </div>
        ))}

        {error && (
          <Card className="bg-accent-50 ring-1 ring-accent/15">
            <p className="text-sm text-accent">{error}</p>
          </Card>
        )}

        {!done && <div ref={sentinelRef} className="h-6" data-testid="activity-sentinel" />}

        {loading && (
          <p className="px-1 py-2 text-center text-xs text-ink-soft">učitavam…</p>
        )}
        {done && items.length > 0 && (
          <p className="px-1 py-4 text-center text-xs text-ink-soft">
            To je sve. Začetak.
          </p>
        )}
      </div>
    </Layout>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const sign = item.direction === "in" ? "+" : "−";
  const colorClass =
    item.direction === "in" ? "text-emerald-700" : "text-ink";
  return (
    <a
      href={`${brand.chain.explorerUrl}/tx/${item.txHash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-ink/[0.02]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {item.direction === "in" ? <ArrowDown /> : <ArrowUp />}
          <span className="text-sm font-medium">
            {item.direction === "in" ? "Primljeno" : "Poslano"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <AddressChip value={item.counterparty} truncate />
          <span className="text-xs text-ink-soft">{timeAgo(item.timestamp)}</span>
        </div>
      </div>
      <div className={`nums shrink-0 text-base font-semibold ${colorClass}`}>
        {sign}
        {formatAmount(item.amount)}{" "}
        <span className="text-xs font-medium text-ink-soft">
          {brand.token.symbol}
        </span>
      </div>
    </a>
  );
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-emerald-700" fill="none">
      <path
        d="M8 3v10m0 0l4-4m-4 4l-4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowUp() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-ink-muted" fill="none">
      <path
        d="M8 13V3m0 0L4 7m4-4l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
