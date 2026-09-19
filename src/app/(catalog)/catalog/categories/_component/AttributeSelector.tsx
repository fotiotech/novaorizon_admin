"use client";

import { useMemo } from "react";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type AttributeFlag = "isRequired" | "isHighlight";

export interface SelectedAttribute {
  attribute: string;
  isRequired: boolean;
  isHighlight: boolean;
}

interface AttributeOption {
  _id: string;
  name: string;
  code: string;
  type: string;
}

interface AttributeSelectorProps {
  mappingId: string;
  groupId: string;
  groupName: string;
  selectedAttributes: SelectedAttribute[];
  allAttributes: AttributeOption[];
  filter: string;
  onFilterChange: (value: string) => void;
  onToggleAttribute: (attrId: string) => void;
  onToggleFlag: (attrId: string, flag: AttributeFlag) => void;
}

// ------------------------------------------------------------------
// Flag metadata
// ------------------------------------------------------------------
interface FlagMeta {
  key: AttributeFlag;
  label: string;
  title: string;
  activeClasses: string;
  inactiveClasses: string;
}

const FLAGS: FlagMeta[] = [
  {
    key: "isRequired",
    label: "Required",
    title: "Required — must be filled in on the product form",
    activeClasses:
      "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    inactiveClasses:
      "border-border bg-background text-muted-foreground hover:text-foreground",
  },
  {
    key: "isHighlight",
    label: "Highlight",
    title: "Highlight — surface this attribute on product cards and the PDP",
    activeClasses:
      "border-pink-400 bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
    inactiveClasses:
      "border-border bg-background text-muted-foreground hover:text-foreground",
  },
];

const FLAG_DEFAULTS: Record<AttributeFlag, boolean> = {
  isRequired: false,
  isHighlight: false,
};

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export default function AttributeSelector({
  mappingId,
  groupId,
  groupName,
  selectedAttributes,
  allAttributes,
  filter,
  onFilterChange,
  onToggleAttribute,
  onToggleFlag,
}: AttributeSelectorProps) {
  const filtered = useMemo(() => {
    const lower = filter.toLowerCase();
    if (!lower) return allAttributes;
    return allAttributes.filter(
      (a) =>
        a?.name?.toLowerCase().includes(lower) ||
        a?.code?.toLowerCase().includes(lower),
    );
  }, [allAttributes, filter]);

  const attrCount = selectedAttributes.length;
  const hasAttributes = attrCount > 0;

  const flagsByAttr = useMemo(() => {
    const map = new Map<string, SelectedAttribute>();
    for (const s of selectedAttributes) map.set(s.attribute, s);
    return map;
  }, [selectedAttributes]);

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm font-medium text-foreground">
            {groupName}
          </span>
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              hasAttributes
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {attrCount} selected
          </span>
        </div>
        {!hasAttributes && (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
            Select at least one
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="relative mb-3">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search attributes…"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No attributes match “{filter}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1 [overflow-anchor:none]">
            {filtered.map((attr) => {
              const entry = flagsByAttr.get(attr._id);
              const selected = !!entry;
              const flags = entry ?? { attribute: attr._id, ...FLAG_DEFAULTS };

              return (
                <div
                  key={attr._id}
                  className={`rounded-lg border transition ${
                    selected
                      ? "border-primary/60 bg-primary/5"
                      : "border-border bg-background hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  {/*
                    A <button> instead of <label><input>. The invisible
                    checkbox previously received focus on click, and the
                    browser would then scroll to keep that (0-size)
                    focused element in view — which pushed the page down.
                    A visible button has no such side-effect.
                  */}
                  <button
                    type="button"
                    onClick={() => onToggleAttribute(attr._id)}
                    aria-pressed={selected}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left cursor-pointer"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        selected
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                      }`}
                      aria-hidden="true"
                    >
                      {selected && (
                        <svg
                          className="h-3 w-3 text-primary-foreground"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm text-foreground">
                      {attr.name}
                    </span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {attr.type}
                    </span>
                  </button>

                  {selected && (
                    <div className="flex flex-wrap gap-1.5 px-3 pb-2.5 pt-0">
                      {FLAGS.map((flag) => {
                        const active = flags[flag.key] === true;
                        return (
                          <button
                            key={flag.key}
                            type="button"
                            onClick={() => onToggleFlag(attr._id, flag.key)}
                            aria-pressed={active}
                            title={flag.title}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
                              active ? flag.activeClasses : flag.inactiveClasses
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full bg-current ${
                                active ? "opacity-80" : "opacity-30"
                              }`}
                              aria-hidden="true"
                            />
                            {flag.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
