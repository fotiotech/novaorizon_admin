// admin/hooks/useLiveEvents.ts
"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

function pusherConfig(): { key: string; cluster: string } | null {
  const key =
    process.env.NEXT_PUBLIC_PUSHER_APP_KEY ??
    process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster =
    process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER ??
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  return key && cluster ? { key, cluster } : null;
}

export interface LiveEventProduct {
  _id: string;
  title?: string;
  image?: string;
  price?: number;
  slug?: string;
}

export interface LiveEvent {
  _id: string;
  userId: string;
  itemId: string | null;
  eventType: "view" | "cart_add" | "purchase" | "like" | "page_view";
  score: number;
  metadata?: Record<string, any>;
  timestamp: string;
  product?: LiveEventProduct | null;
}

type ConnectionState = "connecting" | "open" | "closed";

/**
 * Poll interval for the "live" feed. 3 seconds is a compromise between
 * perceived liveness and backend load — each poll is a single indexed
 * `timestamp > ?` query, but it does hit the API every 3s per open tab.
 * If you ever add Pusher later, replace the poll with a subscription
 * and keep this as the reconnect fallback.
 */
const POLL_INTERVAL = pusherConfig() ? 15000 : 3000;

/**
 * How far back to overlap each poll. The last-known cursor is bumped to
 * `Date.now()` after every successful fetch, but a few hundred ms can
 * elapse between the server building the response and the client
 * receiving it — events created in that gap would be missed without an
 * overlap. 5s of overlap is safe; the `_id` dedupe prevents duplicates.
 */
const OVERLAP_MS = 5000;

/** First poll looks back a full day, matching the page's initial payload. */
const INITIAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Every minute, re-read a wider slice to heal dropped polls/clock gaps. */
const RECONCILE_MS = 60 * 1000;
const RECONCILE_WINDOW_MS = 5 * 60 * 1000;

export function useLiveEvents(max = 200, initial: LiveEvent[] = []) {
  const [events, setEvents] = useState<LiveEvent[]>(initial);
  // Start as "connecting" — flip to "open" only after the first
  // successful poll, so the UI doesn't show "Live" before we've talked
  // to the server once.
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const lastCheckRef = useRef<number>(Date.now() - INITIAL_WINDOW_MS);
  const lastReconcileRef = useRef<number>(0);
  const seenIdsRef = useRef<Set<string>>(new Set(initial.map((e) => e._id)));

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        // Express backend — `/api/events/since` returns
        //   { data: LiveEvent[] }  sorted timestamp ASC
        // `since` is milliseconds since epoch.
        const res = await api.get<{
          data: LiveEvent[];
          serverTime?: number;
        }>("/events/since", {
          params: {
            since: Math.max(
              0,
              lastCheckRef.current -
                (Date.now() - lastReconcileRef.current > RECONCILE_MS
                  ? RECONCILE_WINDOW_MS
                  : OVERLAP_MS),
            ),
            limit: max,
          },
        });

        if (cancelled) return;
        setStatus("open");

        const fresh = res.data.data ?? [];
        // Cursor comes from the server, never the browser clock.
        lastCheckRef.current = res.data.serverTime ?? Date.now();
        lastReconcileRef.current = Date.now();

        if (fresh.length > 0) {
          const newEvents = fresh.filter((e) => !seenIdsRef.current.has(e._id));
          if (newEvents.length > 0) {
            for (const e of newEvents) seenIdsRef.current.add(e._id);
            setEvents((prev) => {
              // Append and trim. Backend already returns timestamp-ASC,
              // so appending preserves order.
              const merged = [...prev, ...newEvents];
              return merged.length > max ? merged.slice(-max) : merged;
            });
          }
        }
      } catch {
        if (!cancelled) setStatus("closed");
      } finally {
        inFlight = false;
        if (!cancelled) {
          timer = setTimeout(poll, POLL_INTERVAL);
        }
      }
    };

    // Recover immediately when the tab becomes visible again — browsers
    // throttle timers in background tabs.
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [max]);

  // Realtime: the backend publishes every tracked event on the "analytics"
  // channel. Polling stays as a fallback/reconciliation path.
  useEffect(() => {
    const config = pusherConfig();
    if (!config) return;

    let pusher: any = null;
    let cancelled = false;

    (async () => {
      try {
        const { default: Pusher } = await import("pusher-js");
        if (cancelled) return;
        pusher = new Pusher(config.key, {
          cluster: config.cluster,
          forceTLS: true,
        });
        const channel = pusher.subscribe("analytics");
        channel.bind("event", (payload: LiveEvent) => {
          if (!payload?._id || seenIdsRef.current.has(payload._id)) return;
          seenIdsRef.current.add(payload._id);
          setStatus("open");
          setEvents((prev) => {
            const merged = [...prev, payload];
            return merged.length > max ? merged.slice(-max) : merged;
          });
        });
      } catch (err) {
        console.error("[useLiveEvents] pusher failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        pusher?.unsubscribe?.("analytics");
        pusher?.disconnect?.();
      } catch {
        /* ignore */
      }
    };
  }, [max]);

  return { events, status };
}