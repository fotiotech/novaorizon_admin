"use client";

import React from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  /** "card" = bordered tile (default); "row" = plain list row. */
  variant?: "card" | "row";
  className?: string;
}

/* Colors used for state — kept as constants so they are guaranteed to render */
const BLUE_600 = "#2563eb";
const BLUE_50 = "#eff6ff";
const BLUE_900 = "#1e3a8a";
const GRAY_300 = "#d1d5db";
const GRAY_400 = "#9ca3af";
const GRAY_700 = "#374151";
const WHITE = "#ffffff";

/**
 * Checkbox whose *visual state* is driven directly by the `checked` prop.
 *
 * - No hidden `<input>` / no `:checked` selector / no Tailwind state class.
 * - When `checked` is true → blue fill + visible checkmark are rendered
 *   *conditionally*, plus the tile background + label turn blue. Cannot fail
 *   to display the correct state.
 * - Renders a `<button role="checkbox">` for keyboard + screen-reader support.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  size = "md",
  variant = "card",
  className = "",
}: CheckboxProps) {
  const boxSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const isCard = variant === "card";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        // Card variant paints its own surface. Row variant is transparent so
        // the surrounding row's hover background shows through.
        backgroundColor: isCard ? (checked ? BLUE_50 : WHITE) : undefined,
        borderColor: isCard ? (checked ? BLUE_600 : GRAY_300) : "transparent",
        borderWidth: isCard ? 2 : 0,
      }}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${isCard ? "" : "hover:bg-gray-50"} ${className}`}
    >
      {/* The checkbox square */}
      <span
        style={{
          backgroundColor: checked ? BLUE_600 : WHITE,
          borderColor: checked ? BLUE_600 : GRAY_400,
        }}
        className={`flex ${boxSize} shrink-0 items-center justify-center rounded-md border-2 transition-colors`}
      >
        {checked ? (
          <svg
            className={`${iconSize} text-white`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </span>

      {(label || hint) && (
        <span className="flex min-w-0 flex-1 flex-col">
          {label ? (
            <span
              style={{ color: checked ? BLUE_900 : GRAY_700 }}
              className="text-sm font-medium"
            >
              {label}
            </span>
          ) : null}
          {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
        </span>
      )}
    </button>
  );
}

export default Checkbox;
