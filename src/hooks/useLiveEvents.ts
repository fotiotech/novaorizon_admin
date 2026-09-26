// app/hooks/useLiveEvents.ts
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

export function useLiveEvents(max = 200, initial: LiveEvent[] = []) {
  const [events, setEvents] = useState<LiveEvent[]>(initial);
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const bufferRef = useRef<LiveEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/analytics/stream");

    es.onopen = () => setStatus("open");

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "connected") {
        setStatus("open");
        return;
      }
      if (msg.type === "events" && Array.isArray(msg.events)) {
        bufferRef.current.push(...msg.events);
        if (!flushTimer.current) {
          flushTimer.current = setTimeout(() => {
            setEvents((prev) => [...prev, ...bufferRef.current].slice(-max));
            bufferRef.current = [];
            flushTimer.current = null;
          }, 100);
        }
      }
    };

    es.onerror = () => setStatus("closed");

    return () => {
      es.close();
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [max]);

  return { events, status };
}
