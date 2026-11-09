// components/content/blocks/RefPicker.tsx
"use client";

import React, { useEffect, useState } from "react";
import { fetchReferenceOptions } from "@/app/actions/collection";
import type { RegistryKey } from "@/lib/content/entityMetadata";

const inputCls =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

interface RefPickerProps {
  label: string;
  refType: RegistryKey;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

export function RefPicker({
  label,
  refType,
  value,
  onChange,
  disabled,
  placeholder,
  required,
}: RefPickerProps) {
  const [options, setOptions] = useState<{ _id: string; name: string }[]>([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Resolve current value → display name
  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const cached = options.find((o) => o._id === value);
    if (cached) {
      setSelectedLabel(cached.name);
      return;
    }
    fetchReferenceOptions(refType, "")
      .then((r) => {
        if (!r.success) return;
        setOptions(r.data || []);
        const match = (r.data || []).find((o: any) => o._id === value);
        if (match) setSelectedLabel(match.name);
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, refType]);

  // Debounced search when dropdown is open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      fetchReferenceOptions(refType, search)
        .then((r) => r.success && setOptions(r.data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      setLoading(false);
    };
  }, [open, search, refType]);

  const displayValue = open
    ? search
    : selectedLabel || (value ? value.slice(-8) : "");

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label ? (
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        ) : null}
      </label>
      <div className="relative">
        <input
          type="text"
          className={inputCls}
          placeholder={placeholder ?? `Search ${refType?.toLowerCase()}…`}
          value={displayValue}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
        />
        {open && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No results</div>
            ) : (
              options.map((o) => (
                <button
                  type="button"
                  key={o._id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(o._id);
                    setSelectedLabel(o.name);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                >
                  {o.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RefPicker;
