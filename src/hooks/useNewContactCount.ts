// hooks/useNewContactCount.ts
"use client";

import { useEffect, useState } from "react";
import { fetchNewContactCount } from "@/lib/api/contact";

/**
 * Polls the server for the number of unread ("new") contact messages.
 * Refreshes every 60 seconds and on mount.
 */
export function useNewContactCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const c = await fetchNewContactCount();
        if (mounted) setCount(c);
      } catch {
        // silently ignore network errors
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}
