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
import AttributeSelector from "./AttributeSelector";
import GroupSelector from "./GroupSelector";

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

interface MappingItemProps {
  mapping: Mapping;
  index: number;
  allSets: AttributeSetOption[];
  allGroups: GroupOption[];
  allAttributes: AttributeOption[];
  groupFilter: string;
  attrFilters: Record<string, string>;
  expanded: boolean; // NEW
  onToggleExpand: () => void; // NEW
  onUpdateSet: (setId: string) => void;
  onRemove: () => void;
  onToggleGroup: (groupId: string) => void;
  onToggleAttribute: (groupId: string, attrId: string) => void;
  onToggleRequired: (groupId: string, attrId: string) => void;
  onGroupFilterChange: (value: string) => void;
  onAttrFilterChange: (groupId: string, value: string) => void;
  hasSetError: boolean;
  fieldError?: string;
}

export default function MappingItem({
  mapping,
  index,
  allSets,
  allGroups,
  allAttributes,
  groupFilter,
  attrFilters,
  expanded,
  onToggleExpand,
  onUpdateSet,
  onRemove,
  onToggleGroup,
  onToggleAttribute,
  onToggleRequired,
  onGroupFilterChange,
  onAttrFilterChange,
  hasSetError,
  fieldError,
}: MappingItemProps) {
  const { id, set, groups } = mapping;
  const setErrorId = `set-error-${id}`;

  // Summary counts for collapsed state
  const totalGroups = groups.length;
  const totalAttributes = groups.reduce(
    (acc, g) => acc + g.attributes.length,
    0,
  );
  const setTitle =
    allSets.find((s) => s._id === set)?.title || set || "Not selected";

  return (
    <div className="border p-4 rounded-md my-4 relative bg-gray-50">
      {/* Remove button always visible */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 text-red-600 hover:text-red-800 transition-colors"
        aria-label="Remove set"
      >
        ✕
      </button>

      {/* Clickable header to toggle expansion */}
      <div
        className="cursor-pointer flex items-center justify-between"
        onClick={onToggleExpand}
      >
        <h4 className="font-medium">
          Set #{index + 1}: <span className="text-blue-600">{setTitle}</span>
        </h4>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{totalGroups} groups</span>
          <span>•</span>
          <span>{totalAttributes} attributes</span>
          <span className="ml-2 transform transition-transform duration-200">
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="mt-4">
          {/* Set dropdown */}
          <div className="mb-4">
            <label
              htmlFor={`set-select-${id}`}
              className="block text-sm font-medium"
            >
              Select Set <span className="text-red-500">*</span>
            </label>
            <select
              id={`set-select-${id}`}
              value={set}
              onChange={(e) => onUpdateSet(e.target.value)}
              className={`w-full border rounded p-2 mt-1 ${
                hasSetError ? "border-red-500" : "border-gray-300"
              }`}
              aria-invalid={hasSetError}
              aria-describedby={hasSetError ? setErrorId : undefined}
              onClick={(e) => e.stopPropagation()} // prevent toggling when clicking inside
            >
              <option value="">Choose a set...</option>
              {allSets.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title} ({s.code})
                </option>
              ))}
            </select>
            {hasSetError && (
              <p id={setErrorId} className="text-red-500 text-sm mt-1">
                {fieldError || "Please select a set."}
              </p>
            )}
          </div>

          {set && (
            <>
              <GroupSelector
                mappingId={id}
                selectedGroups={groups.map((g) => g.group)}
                allGroups={allGroups}
                filter={groupFilter}
                onFilterChange={onGroupFilterChange}
                onToggleGroup={onToggleGroup}
              />

              {groups.map((group) => {
                const groupId = group.group;
                const groupName =
                  allGroups.find((g) => g._id === groupId)?.name || groupId;
                const attrFilterKey = `${id}-${groupId}`;
                const attrFilter = attrFilters[attrFilterKey] || "";

                return (
                  <AttributeSelector
                    key={groupId}
                    mappingId={id}
                    groupId={groupId}
                    groupName={groupName}
                    selectedAttributes={group.attributes}
                    allAttributes={allAttributes}
                    filter={attrFilter}
                    onFilterChange={(value) =>
                      onAttrFilterChange(groupId, value)
                    }
                    onToggleAttribute={(attrId) =>
                      onToggleAttribute(groupId, attrId)
                    }
                    onToggleRequired={(attrId) =>
                      onToggleRequired(groupId, attrId)
                    }
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
