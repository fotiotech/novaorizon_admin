// components/content/blocks/ManualPicker.tsx
"use client";

import React, { useEffect, useState } from "react";
import { fetchAvailableItems } from "@/app/actions/collection";
import { BLOCK_REF_MODELS, type BlockRefModel } from "@/lib/content/constants";

const inputCls =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

const selectCls =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

export interface ManualItem {
  refModel: BlockRefModel;
  refId: string;
}

interface ManualPickerProps {
  value: ManualItem[];
  onChange: (items: ManualItem[]) => void;
  disabled?: boolean;
  max?: number;
}

export function ManualPicker({
  value,
  onChange,
  disabled,
  max = 50,
}: ManualPickerProps) {
  const [refModel, setRefModel] = useState<BlockRefModel>("Product");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<
    { _id: string; name: string; imageUrl: string | null }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [labelCache, setLabelCache] = useState<Record<string, string>>({});

  // Load options for current ref model + search
  useEffect(() => {
    setLoading(true);
    fetchAvailableItems(refModel, search)
      .then((r) => {
        if (!r.success) return;
        setOptions(r.data || []);
        const map: Record<string, string> = {};
        (r.data || []).forEach((d: any) => {
          map[`${refModel}:${d._id}`] = d.name;
        });
        setLabelCache((prev) => ({ ...prev, ...map }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refModel, search]);

  // Resolve labels for already-selected items (when editing an existing block)
  useEffect(() => {
    const models = Array.from(new Set(value.map((v) => v.refModel)));
    models.forEach((m) => {
      fetchAvailableItems(m, "")
        .then((r) => {
          if (!r.success) return;
          const map: Record<string, string> = {};
          (r.data || []).forEach((d: any) => {
            map[`${m}:${d._id}`] = d.name;
          });
          setLabelCache((prev) => ({ ...prev, ...map }));
        })
        .catch(console.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.length]);

  const has = (id: string) =>
    value.some((v) => v.refModel === refModel && v.refId === id);

  const toggle = (id: string) => {
    if (disabled) return;
    if (has(id)) {
      onChange(
        value.filter((v) => !(v.refModel === refModel && v.refId === id)),
      );
    } else {
      if (value.length >= max) return;
      onChange([...value, { refModel, refId: id }]);
    }
  };

  const remove = (item: ManualItem) =>
    onChange(
      value.filter(
        (v) => !(v.refModel === item.refModel && v.refId === item.refId),
      ),
    );

  const atLimit = value.length >= max;

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">
              Selected ({value.length} / {max})
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
              className="text-xs text-rose-600 hover:underline disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {value.map((item) => {
              const key = `${item.refModel}:${item.refId}`;
              const label = labelCache[key] || item.refId.slice(-6);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                >
                  <span className="font-medium text-gray-500">
                    {item.refModel}:
                  </span>
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={disabled}
                    className="ml-1 text-gray-400 hover:text-rose-600 disabled:opacity-40"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <select
            value={refModel}
            onChange={(e) => setRefModel(e.target.value as BlockRefModel)}
            disabled={disabled}
            className={selectCls}
          >
            {BLOCK_REF_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <input
            type="text"
            placeholder={`Search ${refModel.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            className={inputCls}
          />
        </div>
      </div>

      <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
        ) : options.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No results.
          </div>
        ) : (
          options.map((o) => {
            const selected = has(o._id);
            const rowDisabled = disabled || (!selected && atLimit);
            return (
              <button
                key={o._id}
                type="button"
                onClick={() => !rowDisabled && toggle(o._id)}
                disabled={rowDisabled}
                className={`flex w-full items-center gap-3 p-2 text-left text-sm transition ${
                  rowDisabled
                    ? "cursor-not-allowed opacity-50"
                    : selected
                      ? "bg-blue-50/70"
                      : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                    selected
                      ? "border-blue-600 bg-blue-600"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {selected && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {o.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.imageUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded bg-gray-100" />
                )}
                <span className="truncate">{o.name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ManualPicker;
