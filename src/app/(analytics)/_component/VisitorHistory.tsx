// admin/app/(analytics)/_component/VisitorHistory.tsx
"use client";

import { useEffect, useState } from "react";

interface HistoryPoint {
  period: string;
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
  events: number;
  purchases: number;
  revenue: number;
}

type Period = "day" | "week" | "month";

const RANGES: Record<Period, number> = {
  day: 30,
  week: 12,
  month: 12,
};

export function VisitorHistory() {
  const [period, setPeriod] = useState<Period>("day");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/analytics/history?period=${period}&range=${RANGES[period]}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPoints(data.points ?? []);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const totalVisitors = points.reduce((s, p) => s + p.visitors, 0);
  const totalRevenue = points.reduce((s, p) => s + p.revenue, 0);
  const maxVisitors = Math.max(1, ...points.map((p) => p.visitors));

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="text-sm font-medium text-foreground">
          Visitor history
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {totalVisitors.toLocaleString()} visitors · $
            {totalRevenue.toFixed(2)}
          </div>
          <div className="flex rounded-md border border-border p-0.5">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            No data for this range yet.
          </div>
        ) : (
          <>
            <div className="flex h-40 items-end gap-1">
              {points.map((p) => (
                <Bar
                  key={p.period}
                  point={p}
                  max={maxVisitors}
                  period={period}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/70">
              <span>{points[0]?.period}</span>
              <span>{points[points.length - 1]?.period}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Bar({
  point,
  max,
  period,
}: {
  point: HistoryPoint;
  max: number;
  period: Period;
}) {
  const pct = (point.visitors / max) * 100;
  const label = period === "day" ? point.period.slice(5) : point.period;

  return (
    <div
      className="group relative flex-1"
      title={`${point.period}: ${point.visitors} visitors · ${point.events} events`}
    >
      <div
        className="w-full rounded-sm bg-primary/80 transition-all duration-300 group-hover:bg-primary"
        style={{ height: `${Math.max(pct, 2)}%`, minHeight: "2px" }}
      />
      <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md ring-1 ring-border group-hover:block">
        <div className="font-medium">{label}</div>
        <div className="text-muted-foreground">
          {point.visitors} visitors · ${point.revenue.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
