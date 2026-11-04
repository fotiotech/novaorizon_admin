"use client";

import React, { useEffect, useState } from "react";
import { fetchReferenceOptions } from "@/app/actions/collection";
import { ENTITY_METADATA } from "@/lib/content/entityMetadata";
import type {
  AttributeConfig,
  RegistryKey,
} from "@/lib/content/entityMetadata";
import type { TargetType } from "@/lib/content/collectionTypes";

const OPERATORS = [
  { label: "In", value: "$in" },
  { label: "Not In", value: "$nin" },
  { label: "Equal", value: "$eq" },
  { label: "Not Equal", value: "$ne" },
  { label: "Less Than", value: "$lt" },
  { label: "Less Than or Equal", value: "$lte" },
  { label: "Greater Than", value: "$gt" },
  { label: "Greater Than or Equal", value: "$gte" },
];

const BOOLEAN_OPS = new Set(["$eq", "$ne"]);

export interface Rule {
  attribute: string;
  operator: string;
  value: string;
  position: number;
}

interface Props {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  targetType: TargetType;
}

export default function RuleEditor({
  rules,
  onRulesChange,
  targetType,
}: Props) {
  const attributes = ENTITY_METADATA[targetType]?.attributes ?? [];

  const update = (i: number, patch: Partial<Rule>) => {
    onRulesChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRule = () => {
    onRulesChange([
      ...rules,
      { attribute: "", operator: "$eq", value: "", position: rules.length },
    ]);
  };

  const removeRule = (i: number) => {
    const next = rules
      .filter((_, idx) => idx !== i)
      .map((r, idx) => ({ ...r, position: idx }));
    onRulesChange(next);
  };

  return (
    <div className="p-4 border rounded-lg bg-white space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          {ENTITY_METADATA[targetType].singular} Rules
        </h3>
        <button
          type="button"
          onClick={addRule}
          className="bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700"
        >
          + Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="text-center py-6 text-gray-500">
          No rules yet. Add one to start.
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, i) => {
            const attrCfg = attributes.find((a) => a.value === rule.attribute);
            const isBoolean = attrCfg?.valueType === "boolean";
            const operators = isBoolean
              ? OPERATORS.filter((o) => BOOLEAN_OPS.has(o.value))
              : OPERATORS;

            return (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border rounded bg-gray-50"
              >
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Attribute
                  </label>
                  <select
                    className="w-full p-2 border rounded text-sm"
                    value={rule.attribute}
                    onChange={(e) =>
                      update(i, {
                        attribute: e.target.value,
                        value: "",
                        operator: "$eq",
                      })
                    }
                  >
                    <option value="">Select attribute…</option>
                    {attributes.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Operator
                  </label>
                  <select
                    className="w-full p-2 border rounded text-sm"
                    value={rule.operator}
                    onChange={(e) => update(i, { operator: e.target.value })}
                  >
                    {operators.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  {attrCfg?.ref ? (
                    <RefSelect
                      refType={attrCfg.ref}
                      value={rule.value}
                      onChange={(v) => update(i, { value: v })}
                    />
                  ) : isBoolean ? (
                    <select
                      className="w-full p-2 border rounded text-sm"
                      value={rule.value}
                      onChange={(e) => update(i, { value: e.target.value })}
                    >
                      <option value="">Select…</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : attrCfg?.valueType === "number" ? (
                    <input
                      type="number"
                      className="w-full p-2 border rounded text-sm"
                      value={rule.value}
                      onChange={(e) => update(i, { value: e.target.value })}
                    />
                  ) : attrCfg?.valueType === "date" ? (
                    <input
                      type="date"
                      className="w-full p-2 border rounded text-sm"
                      value={rule.value}
                      onChange={(e) => update(i, { value: e.target.value })}
                    />
                  ) : (
                    <input
                      type="text"
                      className="w-full p-2 border rounded text-sm"
                      value={rule.value}
                      onChange={(e) => update(i, { value: e.target.value })}
                      placeholder='e.g. "red" or ["red","blue"]'
                    />
                  )}
                </div>

                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="text-red-500 hover:text-red-700 text-xl leading-none"
                    aria-label="Remove rule"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RefSelect({
  refType,
  value,
  onChange,
}: {
  refType: RegistryKey;
  value: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<{ _id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchReferenceOptions(refType, search)
      .then((r) => r.success && setOptions(r.data || []))
      .catch(console.error);
  }, [refType, search]);

  const selected = options.find((o) => o._id === value);

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full p-2 border rounded text-sm"
        placeholder={`Search ${refType.toLowerCase()}…`}
        value={open ? search : (selected?.name ?? value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setSearch(e.target.value)}
      />
      {open && options.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
          {options.map((o) => (
            <div
              key={o._id}
              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
              onClick={() => {
                onChange(o._id);
                setSearch("");
                setOpen(false);
              }}
            >
              {o.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
