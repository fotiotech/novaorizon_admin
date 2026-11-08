// components/ui/BottomSheet.tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional label for the close button (defaults to "Close"). */
  closeLabel?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  closeLabel = "Close",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof window === "undefined" || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bottom-sheet-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-background shadow-2xl sm:max-w-lg sm:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div
            className="h-1.5 w-12 rounded-full bg-muted-foreground/30"
            aria-hidden
          />
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2
            id="bottom-sheet-title"
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={closeLabel}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export default BottomSheet;
