// admin/src/app/(analytics)/analytics/live/page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import api from "@/lib/api";
import { LiveDashboard } from "../_component/LiveDashboard";

export default function AnalyticsPage() {
  const [recent, setRecent] = useState<any[] | null>(null);
  const [hot, setHot] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // "Recent" = events from the last 24h, up to 200.
        // The original server action returned them newest-first; the live
        // feed appends new events at the bottom, so we reverse to
        // oldest-first before handing them to <LiveDashboard>.
        const since = Date.now() - 24 * 60 * 60 * 1000;

        const [recentRes, hotRes] = await Promise.allSettled([
          api.get<{ data: any[] }>("/events/since", {
            params: { since, limit: 200 },
          }),
          api.get<{ data: any[] }>("/events/trending", {
            params: { limit: 8, windowMinutes: 15 },
          }),
        ]);

        if (cancelled) return;
        if (recentRes.status === "rejected") throw recentRes.reason;

        setRecent([...recentRes.value.data.data].reverse());
        // Trending is a nice-to-have; never let it blank the live feed.
        setHot(
          hotRes.status === "fulfilled" ? hotRes.value.data.data ?? [] : [],
        );
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load live analytics:", err);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setError("Your session expired. Please sign in again.");
          } else if (err.response?.status === 403) {
            setError("You do not have permission to view live analytics.");
          } else {
            setError(
              err.response?.data?.error ?? "Failed to load live analytics",
            );
          }
        } else {
          setError("Network error. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-destructive/10 p-4 sm:p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Don't render <LiveDashboard> until both payloads are ready — the
  // component's internal polling logic expects a concrete initial state.
  if (recent === null || hot === null) {
    return (
      <div className="mx-auto w-full max-w-6xl overflow-x-clip">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-card p-4">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-3 space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className="h-10 w-full animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <LiveDashboard initialEvents={recent} initialHot={hot} />;
}