// admin/app/(analytics)/_component/LiveDashboard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveEvents, type LiveEvent } from "@/hooks/useLiveEvents";
import { HotRightNow } from "./HotRightNow";
import type { HotItem } from "@/lib/events/eventQueries";
import { VisitorHistory } from "./VisitorHistory";

// ─── Constants ────────────────────────────────────────────
const FIVE_MIN = 5 * 60 * 1000;
const ONE_MIN = 60 * 1000;
const BUFFER_SIZE = 500;

// Categorical signal colors — intentionally theme-independent.
// These read clearly on both light and dark surfaces.
const EVENT_META: Record<
  LiveEvent["eventType"],
  { label: string; emoji: string; dot: string }
> = {
  page_view: { label: "Page view", emoji: "👁️", dot: "bg-muted-foreground" },
  view: { label: "Viewed", emoji: "🔍", dot: "bg-blue-500" },
  cart_add: { label: "Added to cart", emoji: "🛒", dot: "bg-amber-500" },
  purchase: { label: "Purchased", emoji: "💰", dot: "bg-emerald-500" },
  like: { label: "Liked", emoji: "❤️", dot: "bg-pink-500" },
};

interface Props {
  initialEvents?: LiveEvent[];
  initialHot?: HotItem[];
}

// ─── Main component ───────────────────────────────────────
export function LiveDashboard({ initialEvents = [], initialHot = [] }: Props) {
  const { events, status } = useLiveEvents(BUFFER_SIZE, initialEvents);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const activeUsers = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (now - new Date(e.timestamp).getTime() < FIVE_MIN) set.add(e.userId);
    }
    return set.size;
  }, [events, now]);

  const eventsLastMin = useMemo(
    () =>
      events.filter((e) => now - new Date(e.timestamp).getTime() < ONE_MIN)
        .length,
    [events, now],
  );

  const revenue = useMemo(
    () =>
      events
        .filter((e) => e.eventType === "purchase")
        .reduce((sum, e) => sum + (e.metadata?.total ?? 0), 0),
    [events],
  );

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events)
      counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
    const total = events.length || 1;
    return Object.entries(counts)
      .map(([type, count]) => ({
        type: type as LiveEvent["eventType"],
        count,
        pct: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  return (
    <div className="space-y-4">
      <StatusBar status={status} count={events.length} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visitors" hint="last 5m" value={activeUsers} />
        <Stat label="Events" hint="last 1m" value={eventsLastMin} />
        <Stat label="Total" hint="in buffer" value={events.length} />
        <Stat
          label="Revenue"
          hint="in buffer"
          value={`$${revenue.toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed events={events} />
        </div>
        <div className="space-y-4">
          <VisitorHistory />
          <HotRightNow initial={initialHot} windowMinutes={15} />
          <EventBreakdown breakdown={breakdown} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────

function StatusBar({
  status,
  count,
}: {
  status: "connecting" | "open" | "closed";
  count: number;
}) {
  const map = {
    connecting: { dot: "bg-amber-400 animate-pulse", label: "Connecting" },
    open: { dot: "bg-emerald-500", label: "Live" },
    closed: { dot: "bg-destructive", label: "Disconnected" },
  }[status];

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${map.dot}`} />
        <span>{map.label}</span>
      </div>
      <span className="tabular-nums text-muted-foreground/70">
        {count} events in buffer
      </span>
    </div>
  );
}

function Stat({
  label,
  hint,
  value,
}: {
  label: string;
  hint?: string;
  value: number | string;
}) {
  const isEmpty =
    (typeof value === "number" && value === 0) ||
    (typeof value === "string" && value === "$0.00");

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        {hint && (
          <div className="text-[10px] text-muted-foreground/60">{hint}</div>
        )}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${
          isEmpty ? "text-muted-foreground/40" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ActivityFeed({ events }: { events: LiveEvent[] }) {
  const recent = [...events].reverse().slice(0, 60);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="text-sm font-medium text-foreground">Live activity</div>
        <div className="text-xs text-muted-foreground/70">newest first</div>
      </div>

      {recent.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          Waiting for activity…
        </div>
      ) : (
        <ul className="max-h-[640px] divide-y divide-border/60 overflow-y-auto">
          {recent.map((e) => (
            <ActivityRow key={e._id} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityRow({ event: e }: { event: LiveEvent }) {
  const meta = EVENT_META[e.eventType];

  const title =
    e.product?.title ??
    e.metadata?.path ??
    (e.itemId ? `item ${e.itemId.slice(-6)}` : "—");

  const subtitle = e.product?.title ? e.metadata?.path : undefined;

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <div className="relative shrink-0">
        {e.product?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.product.image}
            alt=""
            className="h-9 w-9 rounded-md bg-muted object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-sm">
            {meta.emoji}
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${meta.dot}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {title}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span>{meta.label}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{formatRelative(e.timestamp)}</span>
          {subtitle && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="truncate text-muted-foreground/70">
                {subtitle}
              </span>
            </>
          )}
        </div>
      </div>

      {e.score > 1 && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          +{e.score}
        </span>
      )}
    </li>
  );
}

function EventBreakdown({
  breakdown,
}: {
  breakdown: { type: LiveEvent["eventType"]; count: number; pct: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border/60 px-4 py-3 text-sm font-medium text-foreground">
        Event mix
      </div>
      <div className="space-y-3 p-4">
        {breakdown.length === 0 && (
          <p className="text-xs text-muted-foreground">No events yet.</p>
        )}
        {breakdown.map(({ type, count, pct }) => {
          const meta = EVENT_META[type];
          return (
            <div key={type}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{meta.label}</span>
                <span className="tabular-nums text-muted-foreground/70">
                  {count}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${meta.dot} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Utils
// ─────────────────────────────────────────────────────────

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
