// src/app/(dashboard)/dashboard/notifications/_component/hooks/useUnreadOrderNotifications.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export function useUnreadOrderNotifications() {
  const [count, setCount] = useState(0);
  const pusherRef = useRef<Pusher | null>(null);

  const refresh = useCallback(async () => {
    if (!API) return;
    try {
      const res = await fetch(
        `${API}/api/notifications/unread-count?type=order`, // ← plural
        { cache: "no-store", credentials: "include" },
      );

      if (!res.ok) {
        console.error("[unread-orders] non-OK:", res.status);
        return;
      }

      const data = await res.json();
      if (typeof data?.count === "number") {
        setCount(data.count);
      }
    } catch (err) {
      console.error("[unread-orders] fetch failed:", err);
    }
  }, []);

  const markAllRead = useCallback(async (): Promise<boolean> => {
    if (!API) return false;
    try {
      const res = await fetch(`${API}/api/notifications/mark-all-read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "order" }),
      });

      if (!res.ok) {
        console.error("[unread-orders] markAllRead failed:", res.status);
        return false;
      }

      setCount(0);
      window.dispatchEvent(new Event("order-notifications-read"));
      return true;
    } catch (err) {
      console.error("[unread-orders] markAllRead error:", err);
      return false;
    }
  }, []);

  // Initial fetch + resync on focus/visibility.
  useEffect(() => {
    refresh();

    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Listen for "mark all read" fired elsewhere in the app.
  useEffect(() => {
    const onExternal = () => refresh();
    window.addEventListener("order-notifications-read", onExternal);
    return () =>
      window.removeEventListener("order-notifications-read", onExternal);
  }, [refresh]);

  // Real-time: increment on every live order notification.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe("admin-notifications");
    channel.bind("new-notification", (data: { type?: string }) => {
      if (data?.type === "order") {
        setCount((c) => c + 1);
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("admin-notifications");
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, []);

  return { count, refresh, markAllRead };
}
