// components/ProductPicker.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ProductOption {
  value: string;
  label: string;
  price?: number;
  sku?: string;
  image?: string;
}

interface ProductPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: ProductOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  maxResults?: number;
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-CM", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

// ─────────────────────────────────────────────────────────────────────
// Small square thumbnail. Plain <img> rather than next/image because
// product images may live on arbitrary CDNs that aren't in
// next.config.js remotePatterns, and these are 32–40px decorations
// where optimization overhead isn't worth it.
// ─────────────────────────────────────────────────────────────────────
function Thumb({
  src,
  alt,
  size = 32,
}: {
  src?: string;
  alt: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg
          width={size * 0.4}
          height={size * 0.4}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md border border-border object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function ProductPicker({
  value,
  onChange,
  options,
  placeholder = "Search products…",
  emptyMessage = "No matching products.",
  disabled = false,
  maxResults = 50,
}: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const byValue = useMemo(() => {
    const m = new Map<string, ProductOption>();
    for (const o of options) m.set(o.value, o);
    return m;
  }, [options]);

  const selected: ProductOption[] = useMemo(
    () =>
      value
        .map((v) => byValue.get(v))
        .filter((o): o is ProductOption => Boolean(o)),
    [value, byValue],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = options.filter((o) => !value.includes(o.value));
    if (!q) return pool.slice(0, maxResults);
    return pool
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.sku ? o.sku.toLowerCase().includes(q) : false),
      )
      .slice(0, maxResults);
  }, [query, options, value, maxResults]);

  useEffect(() => {
    setHighlight(0);
  }, [query, results.length]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const add = (v: string) => {
    if (!value.includes(v)) onChange([...value, v]);
    setQuery("");
    inputRef.current?.focus();
  };

  const remove = (v: string) => {
    onChange(value.filter((x) => x !== v));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[highlight]) {
        e.preventDefault();
        add(results[highlight].value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1].value);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.value}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 py-0.5 pl-0.5 pr-2 text-[12px] text-foreground"
            >
              <Thumb src={s.image} alt={s.label} size={22} />
              <span className="max-w-[180px] truncate">{s.label}</span>
              <button
                type="button"
                onClick={() => remove(s.value)}
                aria-label={`Remove ${s.label}`}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={inputCls}
      />

      {/* Results dropdown */}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-muted-foreground">
              {query.trim() ? emptyMessage : "All products selected."}
            </p>
          ) : (
            <ul ref={listRef} className="max-h-72 overflow-y-auto py-1">
              {results.map((o, i) => {
                const active = i === highlight;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      data-idx={i}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => add(o.value)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        active ? "bg-muted/70" : "hover:bg-muted/40"
                      }`}
                    >
                      <Thumb src={o.image} alt={o.label} size={36} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-foreground">
                          {o.label}
                        </p>
                        {o.sku && (
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {o.sku}
                          </p>
                        )}
                      </div>

                      {o.price !== undefined && (
                        <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                          {formatPrice(o.price)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
