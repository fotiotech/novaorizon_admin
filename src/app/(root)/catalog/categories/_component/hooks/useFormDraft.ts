// useFormDraft.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCategoryPropertyDraft,
  saveCategoryPropertyDraft,
  deleteCategoryPropertyDraft,
} from "@/app/actions/category_property_draft";

const DRAFT_VERSION = 1;

export interface StoredDraft<T> {
  version: number;
  savedAt: number;
  data: T;
}

interface UseFormDraftArgs<T> {
  /** Unique key for this form. Include an entity id for edit forms. */
  key: string;
  /** Optional per-user scoping. Pass the session user id if available. */
  userId?: string | null;
  /** Current form data. Autosaved (debounced) while `enabled`. */
  data: T;
  /** Disable autosave (e.g. while loading, saving, or before first edit). */
  enabled: boolean;
  /** Return true to skip saving an untouched / empty form. */
  isEmpty?: (data: T) => boolean;
  /** Debounce window in ms. Default 700. */
  debounceMs?: number;
}

interface UseFormDraftResult<T> {
  /** True once the initial draft fetch has completed. */
  loaded: boolean;
  /** A stored draft the user hasn't restored or dismissed yet. */
  pendingDraft: StoredDraft<T> | null;
  /** Timestamp of the most recent autosave. */
  savedAt: number | null;
  /** Apply the pending draft to the form and remove it from "pending". */
  consumePendingDraft: () => T | null;
  /** Discard the pending draft without applying it. */
  dismissPendingDraft: () => Promise<void>;
  /** Remove the stored draft entirely. Call after a successful submit. */
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
        const stored = await getCategoryPropertyDraft(key, userId);
        if (cancelled) return;

        if (stored && stored.version === DRAFT_VERSION) {
          setPendingDraft(stored);
          setSavedAt(stored.savedAt);
        } else if (stored) {
          // Schema change — drop incompatible drafts.
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
    if (!loaded) return; // don't race the initial fetch
    if (!enabled) return;
    if (pendingDraft) return; // don't clobber an un-reviewed draft
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
        // Ignore stale responses from an out-of-order save.
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
    // Keep the row in the DB; the next autosave refreshes it. We only
    // stop treating it as "pending review" locally.
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
