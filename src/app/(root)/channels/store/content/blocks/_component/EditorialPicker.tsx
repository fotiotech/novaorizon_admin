// components/content/blocks/EditorialPicker.tsx
"use client";

import { useEffect, useState } from "react";
import {
  fetchEditorialOptions,
  type EditorialOption,
} from "@/app/actions/editorial-content";

const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

export function EditorialPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<EditorialOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetchEditorialOptions(search)
        .then((opts) => setOptions(opts))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        className={inputCls}
        placeholder="Search editorials…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
      />

      <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {loading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : options.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No editorials found.
          </p>
        ) : (
          options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                disabled={disabled}
                className={`flex w-full items-center gap-3 p-3 text-left transition ${
                  selected ? "bg-primary/5" : "hover:bg-muted/40"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
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
                  <p className="truncate text-[12px] text-muted-foreground">
                    {opt.imageCount === 0
                      ? "no gallery images"
                      : `${opt.imageCount} gallery image${opt.imageCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                {selected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EditorialPicker;
