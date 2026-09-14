"use client";

import React, { useEffect } from "react";

interface LeftSheetProps {
  /** Controls visibility. Content is unmounted when `false`. */
  open: boolean;
  /** Called on backdrop click, Escape, or a programmatic close. */
  onClose: () => void;
  /** Sheet content — the caller owns the header/footer. */
  children: React.ReactNode;
  /** Panel width classes. Defaults to `w-72`. */
  width?: string;
  /** Extra classes for the panel. */
  panelClassName?: string;
}

const LeftSheet: React.FC<LeftSheetProps> = ({
  open,
  onClose,
  children,
  width = "w-72",
  panelClassName = "",
}) => {
  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative ${width} h-full flex flex-col bg-background border-r border-border shadow-2xl ${panelClassName}`}
        style={{ animation: "slideInLeft 0.25s ease-out" }}
      >
        {children}
        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0.6; }
            to   { transform: translateX(0);     opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LeftSheet;
