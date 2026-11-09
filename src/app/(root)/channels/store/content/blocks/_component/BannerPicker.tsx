// components/content/blocks/BannerPicker.tsx
"use client";

import { useEffect, useState } from "react";
import {
  fetchBannerOptions,
  type BannerOption,
} from "@/app/actions/banner-content";

const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

export function BannerPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<BannerOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetchBannerOptions(search)
        .then((opts) => setOptions(opts))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const selectedSet = new Set(value);
  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          className={inputCls}
          placeholder="Search banners…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <span className="shrink-0 text-[12px] text-muted-foreground">
          {value.length} selected
        </span>
      </div>

      <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {loading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : options.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No banners found.
          </p>
        ) : (
          options.map((opt) => {
            const selected = selectedSet.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                disabled={disabled}
                className={`flex w-full items-center gap-3 p-3 text-left transition ${
                  selected ? "bg-primary/5" : "hover:bg-muted/40"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  }`}
                >
                  {selected && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {opt.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={opt.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md border border-border bg-muted object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-border bg-muted/40" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {opt.label}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default BannerPicker;
