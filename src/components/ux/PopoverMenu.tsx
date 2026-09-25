"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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

const MENU_MIN_WIDTH = 192; // matches min-w-[12rem]
const VIEWPORT_MARGIN = 8;

export function PopoverMenu({
  items,
  trigger,
  align = "right",
  ariaLabel = "Open menu",
}: PopoverMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position state (fixed / viewport coordinates).
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "bottom" | "top";
  }>({ top: 0, left: 0, placement: "bottom" });

  useEffect(() => setMounted(true), []);

  // Compute position whenever the menu opens, or on scroll/resize while open.
  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const triggerEl = triggerRef.current;
      const menuEl = menuRef.current;
      if (!triggerEl) return;

      const rect = triggerEl.getBoundingClientRect();
      const menuHeight = menuEl?.offsetHeight ?? 0;
      const menuWidth = menuEl?.offsetWidth ?? MENU_MIN_WIDTH;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const placement: "bottom" | "top" =
        spaceBelow < menuHeight + VIEWPORT_MARGIN && spaceAbove > spaceBelow
          ? "top"
          : "bottom";

      const top =
        placement === "bottom" ? rect.bottom + 4 : rect.top - menuHeight - 4;

      // Horizontal alignment relative to the trigger, then clamped to viewport.
      let left = align === "right" ? rect.right - menuWidth : rect.left;
      left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(left, window.innerWidth - menuWidth - VIEWPORT_MARGIN),
      );

      setPos({ top, left, placement });
    };

    // Menu must be in the DOM to measure — run after paint, then again on
    // next frame in case the height settles after fonts/icons load.
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align]);

  // Outside click + Escape handling.
  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const menu =
    open && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          minWidth: MENU_MIN_WIDTH,
          // Avoid the initial 1-frame flash at (0, 0) while measuring.
          visibility: pos.top === 0 && pos.left === 0 ? "hidden" : "visible",
        }}
        className="z-[1000] rounded-lg border border-border bg-card text-card-foreground shadow-lg py-1"
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
    ) : null;

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          ref={triggerRef}
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
      </div>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
