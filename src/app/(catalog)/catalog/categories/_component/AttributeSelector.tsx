"use client";

import React, { useState, useEffect } from "react";
import { getAttributesByGroup } from "@/app/actions/category";

interface AttributeOption {
  _id: string;
  name: string;
  code: string;
  type: string;
}

interface SelectedAttribute {
  attribute: string;
  isRequired: boolean;
}

interface Props {
  groupId: string;
  selectedAttributes: SelectedAttribute[];
  onUpdate: (attrs: SelectedAttribute[]) => void;
}

export default function AttributeSelector({
  groupId,
  selectedAttributes,
  onUpdate,
}: Props) {
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAttributesByGroup(groupId)
      .then((attrs) => setAttributes(attrs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupId]);

  const toggleAttribute = (attrId: string) => {
    const exists = selectedAttributes.some((a) => a.attribute === attrId);
    const updated = exists
      ? selectedAttributes.filter((a) => a.attribute !== attrId)
      : [...selectedAttributes, { attribute: attrId, isRequired: false }];
    onUpdate(updated);
  };

  const toggleRequired = (attrId: string) => {
    const updated = selectedAttributes.map((a) =>
      a.attribute === attrId ? { ...a, isRequired: !a.isRequired } : a,
    );
    onUpdate(updated);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading attributes…</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
      {attributes.map((attr) => {
        const selected = selectedAttributes.find(
          (a) => a.attribute === attr._id,
        );
        const isChecked = !!selected;

        return (
          <div
            key={attr._id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              isChecked
                ? "border-indigo-500 bg-indigo-50/50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <label className="relative flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAttribute(attr._id)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600 border-gray-300 bg-white">
                  {isChecked && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {attr.name}
                </span>
              </label>
            </div>

            {isChecked && (
              <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.isRequired}
                  onChange={() => toggleRequired(attr._id)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors peer-checked:border-indigo-500 peer-checked:bg-indigo-500 border-gray-300 bg-white">
                  {selected.isRequired && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-gray-500 select-none">Required</span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
