// components/EntityPicker.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface EntityOption {
  value: string;
  label: string;
  sublabel?: string;
  /** Small pill shown next to the label (e.g. "percentage"). */
  badge?: string;
  /** Render dimmed + "Inactive" tag. Used for deactivated promotions. */
  inactive?: boolean;
}

interface EntityPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: EntityOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  maxResults?: number;
  /** Text shown below the input — use for scope/behaviour hints. */
  hint?: string;
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

export function EntityPicker({
  value,
  onChange,
  options,
  placeholder = "Search…",
  emptyMessage = "No matches.",
  disabled = false,
  maxResults = 50,
  hint,
}: EntityPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const byValue = useMemo(() => {
    const m = new Map<string, EntityOption>();
    for (const o of options) m.set(o.value, o);
    return m;
  }, [options]);

  const selected: EntityOption[] = useMemo(
    () =>
      value
        .map((v) => byValue.get(v))
        .filter((o): o is EntityOption => Boolean(o)),
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
          (o.sublabel ? o.sublabel.toLowerCase().includes(q) : false),
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

  const remove = (v: string) => onChange(value.filter((x) => x !== v));

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
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.value}
              className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-2 text-[12px] ${
                s.inactive
                  ? "border-border bg-muted/40 text-muted-foreground"
                  : "border-border bg-muted/60 text-foreground"
              }`}
            >
              <span className="max-w-[180px] truncate">{s.label}</span>
              {s.badge && (
                <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.badge}
                </span>
              )}
              {s.inactive && (
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Inactive
                </span>
              )}
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

      {hint && (
        <p className="mt-1.5 text-[12px] text-muted-foreground">{hint}</p>
      )}

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-muted-foreground">
              {query.trim() ? emptyMessage : "All selected."}
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
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-[14px] font-medium ${
                            o.inactive
                              ? "text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {o.label}
                        </p>
                        {o.sublabel && (
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {o.sublabel}
                          </p>
                        )}
                      </div>
                      {o.badge && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {o.badge}
                        </span>
                      )}
                      {o.inactive && (
                        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Inactive
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
