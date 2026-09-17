"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

export interface PopoverMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

interface PopoverMenuProps {
  items: PopoverMenuItem[];
  trigger?: ReactNode;
  align?: "left" | "right";
  ariaLabel?: string;
}

export function PopoverMenu({
  items,
  trigger,
  align = "right",
  ariaLabel = "Open menu",
}: PopoverMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        {trigger ?? (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1 min-w-[12rem] rounded-lg border border-border bg-card text-card-foreground shadow-lg py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => {
            const base = `flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition ${
              item.danger
                ? "text-destructive hover:bg-destructive/10"
                : "text-foreground hover:bg-muted"
            } ${item.disabled ? "opacity-50 pointer-events-none" : ""}`;

            if (item.href) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={close}
                  role="menuitem"
                  className={base}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onClick?.();
                }}
                className={base}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
