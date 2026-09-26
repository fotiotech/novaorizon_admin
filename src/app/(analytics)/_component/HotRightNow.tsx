"use client";

import { useEffect, useState } from "react";
import type { HotItem } from "@/lib/events/eventQueries";

const REFRESH_MS = 20_000;

interface Props {
  initial?: HotItem[];
  windowMinutes?: number;
}

export function HotRightNow({ initial = [], windowMinutes = 15 }: Props) {
  const [items, setItems] = useState<HotItem[]>(initial);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/analytics/hot?window=${windowMinutes}&limit=8`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch {}
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [windowMinutes]);

  const maxScore = Math.max(1, ...items.map((i) => i.score));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-medium text-slate-900">Hot right now</div>
        <div className="text-xs text-slate-400">last {windowMinutes}m</div>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-slate-400">
          No activity in this window.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <li key={item._id} className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400">
                  {idx + 1}
                </span>

                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-md bg-slate-100 object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-md bg-slate-100" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {item.title ?? `item ${item._id.slice(-6)}`}
                    </span>
                    <Trend delta={item.delta} />
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span title="views">👁️ {item.counts.view}</span>
                    <span title="cart adds">🛒 {item.counts.cart_add}</span>
                    <span title="purchases">💰 {item.counts.purchase}</span>
                    <span title="likes">❤️ {item.counts.like}</span>
                  </div>
                </div>

                <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                  {item.score}
                </span>
              </div>

              <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                  style={{ width: `${(item.score / maxScore) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Trend({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-slate-300">—</span>;
  const up = delta > 0;
  return (
    <span
      className={`shrink-0 text-[11px] font-medium tabular-nums ${
        up ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}
