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

interface GroupSelectorProps {
  mappingId: string;
  selectedGroups: string[];
  allGroups: GroupOption[];
  filter: string;
  onFilterChange: (value: string) => void;
  onToggleGroup: (groupId: string) => void;
}

export default function GroupSelector({
  mappingId,
  selectedGroups,
  allGroups,
  filter,
  onFilterChange,
  onToggleGroup,
}: GroupSelectorProps) {
  const filtered = useMemo(() => {
    const lower = filter.toLowerCase();
    if (!lower) return allGroups;
    return allGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(lower) ||
        g.code.toLowerCase().includes(lower),
    );
  }, [allGroups, filter]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          Select Groups & Attributes
        </label>
        <span className="text-xs text-gray-500">
          {selectedGroups.length} groups selected
        </span>
      </div>

      {/* Filter */}
      <input
        type="text"
        placeholder="Filter groups..."
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="w-full border border-gray-300 rounded p-1 text-sm mt-1 mb-2"
      />

      {/* Scrollable Group Buttons */}
      <div className="max-h-48 overflow-y-auto">
        <div className="flex flex-wrap gap-2 mt-1">
          {filtered.map((group) => {
            const isSelected = selectedGroups.includes(group._id);
            return (
              <button
                key={group._id}
                type="button"
                onClick={() => onToggleGroup(group._id)}
                className={`px-3 py-1 rounded-full border transition-colors ${
                  isSelected
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {group.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
