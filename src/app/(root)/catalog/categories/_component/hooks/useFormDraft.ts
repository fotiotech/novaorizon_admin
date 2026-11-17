// useFormDraft.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCategoryPropertyDraft,
  saveCategoryPropertyDraft,
  deleteCategoryPropertyDraft,
} from "@/lib/api/category-property-draft";

const DRAFT_VERSION = 1;

export interface StoredDraft<T> {
  version: number;
  savedAt: number;
  data: T;
}

interface UseFormDraftArgs<T> {
  key: string;
  userId?: string | null;
  data: T;
  enabled: boolean;
  isEmpty?: (data: T) => boolean;
  debounceMs?: number;
}

interface UseFormDraftResult<T> {
  loaded: boolean;
  pendingDraft: StoredDraft<T> | null;
  savedAt: number | null;
  consumePendingDraft: () => T | null;
  dismissPendingDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
}

export function useFormDraft<T>({
  key,
  userId = null,
  data,
  enabled,
  isEmpty,
  debounceMs = 700,
}: UseFormDraftArgs<T>): UseFormDraftResult<T> {
  const [loaded, setLoaded] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<StoredDraft<T> | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerializedRef = useRef<string | null>(null);
  const seqRef = useRef(0);

  // ---- Load existing draft whenever the key (or user) changes. ------
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setPendingDraft(null);
    setSavedAt(null);
    lastSerializedRef.current = null;

    (async () => {
      try {
        const stored = await fetchCategoryPropertyDraft<T>(key, userId);
        if (cancelled) return;

        if (stored && stored.version === DRAFT_VERSION) {
          setPendingDraft(stored);
          setSavedAt(stored.savedAt);
        } else if (stored) {
          await deleteCategoryPropertyDraft(key, userId);
        }
      } catch {
        /* network / db failure — treat as "no draft" */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, userId]);

  // ---- Debounced autosave. ------------------------------------------
  useEffect(() => {
    if (!loaded) return;
    if (!enabled) return;
    if (pendingDraft) return;
    if (isEmpty?.(data)) return;

    let serialized: string;
    try {
      serialized = JSON.stringify(data);
    } catch {
      return;
    }
    if (serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const seq = ++seqRef.current;
      try {
        const res = await saveCategoryPropertyDraft({
          key,
          userId,
          version: DRAFT_VERSION,
          data,
        });
        if (seq === seqRef.current) setSavedAt(res.savedAt);
      } catch {
        /* swallow — the user can still submit; next edit retries */
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, enabled, pendingDraft, debounceMs, key, userId, isEmpty, loaded]);

  // ---- Actions -------------------------------------------------------
  const consumePendingDraft = useCallback((): T | null => {
    if (!pendingDraft) return null;
    const value = pendingDraft.data;
    setPendingDraft(null);
    return value;
  }, [pendingDraft]);

  const dismissPendingDraft = useCallback(async () => {
    try {
      await deleteCategoryPropertyDraft(key, userId);
    } catch {
      /* ignore */
    }
    lastSerializedRef.current = null;
    setPendingDraft(null);
    setSavedAt(null);
  }, [key, userId]);

  const clearDraft = useCallback(async () => {
    try {
      await deleteCategoryPropertyDraft(key, userId);
    } catch {
      /* ignore */
    }
    lastSerializedRef.current = null;
    setPendingDraft(null);
    setSavedAt(null);
  }, [key, userId]);

  return {
    loaded,
    pendingDraft,
    savedAt,
    consumePendingDraft,
    dismissPendingDraft,
    clearDraft,
  };
}
