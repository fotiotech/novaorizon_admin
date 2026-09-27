// admin/hooks/useLiveEvents.ts
"use client";

import { useEffect, useRef, useState } from "react";

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

const POLL_INTERVAL = 3000;

export function useLiveEvents(max = 200, initial: LiveEvent[] = []) {
  const [events, setEvents] = useState<LiveEvent[]>(initial);
  const [status, setStatus] = useState<ConnectionState>("open");
  const lastCheckRef = useRef<number>(Date.now());
  const seenIdsRef = useRef<Set<string>>(new Set(initial.map((e) => e._id)));

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/analytics/recent?since=${lastCheckRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fresh: LiveEvent[] = await res.json();

        lastCheckRef.current = Date.now();

        if (cancelled) return;
        setStatus("open");

        if (fresh.length > 0) {
          const newEvents = fresh.filter((e) => !seenIdsRef.current.has(e._id));
          if (newEvents.length > 0) {
            for (const e of newEvents) seenIdsRef.current.add(e._id);
            setEvents((prev) => [...prev, ...newEvents].slice(-max));
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
