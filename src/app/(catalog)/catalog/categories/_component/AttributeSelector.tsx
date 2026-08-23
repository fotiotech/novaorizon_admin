"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryPropertyWithMappings,
  updateCategoryPropertyWithMappings,
  getCategoryProperty,
  getAllAttributeSets,
  getAllAttributeGroups,
  getAllAttributes,
} from "@/app/actions/category";

// --- Types ---
interface Mapping {
  id: string;
  set: string;
  groups: {
    group: string;
    attributes: {
      attribute: string;
      isRequired: boolean;
    }[];
  }[];
}

interface AttributeSetOption {
  _id: string;
  title: string;
  code: string;
}

interface GroupOption {
  _id: string;
  name: string;
  code: string;
}

interface AttributeOption {
  _id: string;
  name: string;
  code: string;
  type: string;
}

interface Props {
  propertyId?: string;
  onSuccess?: () => void;
}

// Utility
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

interface AttributeSelectorProps {
  mappingId: string;
  groupId: string;
  groupName: string;
  selectedAttributes: { attribute: string; isRequired: boolean }[];
  allAttributes: AttributeOption[];
  filter: string;
  onFilterChange: (value: string) => void;
  onToggleAttribute: (attrId: string) => void;
  onToggleRequired: (attrId: string) => void;
}

export default function AttributeSelector({
  mappingId,
  groupId,
  groupName,
  selectedAttributes,
  allAttributes,
  filter,
  onFilterChange,
  onToggleAttribute,
  onToggleRequired,
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

  return (
    <div className="ml-4 mt-3 p-3 border-l-2 border-blue-300 bg-gray-50 rounded-r ">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-2">
          {groupName}
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              hasAttributes
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {attrCount} {attrCount === 1 ? "attribute" : "attributes"}
          </span>
        </span>
        {!hasAttributes && (
          <span className="text-xs text-red-500 font-medium">
            ⚠️ Select at least one
          </span>
        )}
      </div>

      {/* Filter */}
      <input
        type="text"
        placeholder="Filter attributes..."
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="w-full border border-gray-300 rounded p-1 text-sm mt-2 mb-2"
      />

      {/* Scrollable Attribute Grid */}
      <div className="mt-2 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((attr) => {
            const selected = selectedAttributes.some(
              (a) => a.attribute === attr._id,
            );
            const required = selectedAttributes.find(
              (a) => a.attribute === attr._id,
            )?.isRequired;

            return (
              <div
                key={attr._id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selected
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <label className="relative flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => onToggleAttribute(attr._id)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600 border-gray-300 bg-white">
                      {selected && (
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

                {selected && (
                  <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!required}
                      onChange={() => onToggleRequired(attr._id)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors peer-checked:border-indigo-500 peer-checked:bg-indigo-500 border-gray-300 bg-white">
                      {required && (
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
      </div>
    </div>
  );
}
