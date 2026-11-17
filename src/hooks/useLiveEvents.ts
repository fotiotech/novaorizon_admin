// admin/hooks/useLiveEvents.ts
"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

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
const POLL_INTERVAL = 3000;

/**
 * How far back to overlap each poll. The last-known cursor is bumped to
 * `Date.now()` after every successful fetch, but a few hundred ms can
 * elapse between the server building the response and the client
 * receiving it — events created in that gap would be missed without an
 * overlap. 5s of overlap is safe; the `_id` dedupe prevents duplicates.
 */
const OVERLAP_MS = 5000;

export function useLiveEvents(max = 200, initial: LiveEvent[] = []) {
  const [events, setEvents] = useState<LiveEvent[]>(initial);
  // Start as "connecting" — flip to "open" only after the first
  // successful poll, so the UI doesn't show "Live" before we've talked
  // to the server once.
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const lastCheckRef = useRef<number>(Date.now() - OVERLAP_MS);
  const seenIdsRef = useRef<Set<string>>(new Set(initial.map((e) => e._id)));

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;
      try {
        // Express backend — `/api/events/since` returns
        //   { data: LiveEvent[] }  sorted timestamp ASC
        // `since` is milliseconds since epoch.
        const res = await api.get<{ data: LiveEvent[] }>("/events/since", {
          params: {
            since: Math.max(0, lastCheckRef.current - OVERLAP_MS),
            limit: max,
          },
        });

        if (cancelled) return;
        setStatus("open");

        const fresh = res.data.data ?? [];
        lastCheckRef.current = Date.now();

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
        if (!cancelled) {
          timer = setTimeout(poll, POLL_INTERVAL);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [max]);

  return { events, status };
}
