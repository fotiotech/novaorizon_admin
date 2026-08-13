"use client";

import React, { useCallback, useState } from "react";
import AttributeSelector from "./AttributeSelector";

interface GroupOption {
  _id: string;
  name: string;
  code: string;
}

interface SelectedGroup {
  group: string;
  attributes: {
    attribute: string;
    isRequired: boolean;
  }[];
}

interface Props {
  setGroups: GroupOption[];
  selectedGroups: SelectedGroup[];
  onUpdate: (groups: SelectedGroup[]) => void;
  isLoading?: boolean;
}

export default function GroupSelector({
  setGroups,
  selectedGroups,
  onUpdate,
  isLoading,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback(
    (groupId: string) => {
      const exists = selectedGroups.some((g) => g.group === groupId);
      const updated = exists
        ? selectedGroups.filter((g) => g.group !== groupId)
        : [...selectedGroups, { group: groupId, attributes: [] }];
      console.log(`[GroupSelector] toggleGroup: ${groupId}, updated:`, updated);
      onUpdate(updated);
    },
    [selectedGroups, onUpdate],
  );

  const updateGroupAttributes = useCallback(
    (groupId: string, attributes: SelectedGroup["attributes"]) => {
      const updated = selectedGroups.map((g) =>
        g.group === groupId ? { ...g, attributes } : g,
      );
      console.log(
        `[GroupSelector] updateGroupAttributes for ${groupId}:`,
        updated,
      );
      onUpdate(updated);
    },
    [selectedGroups, onUpdate],
  );

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) newSet.delete(groupId);
      else newSet.add(groupId);
      return newSet;
    });
  };

  if (isLoading) return <div>Loading groups…</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {setGroups.map((g) => {
          const isSelected = selectedGroups.some((sg) => sg.group === g._id);
          return (
            <button
              key={g._id}
              type="button"
              onClick={() => toggleGroup(g._id)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                isSelected
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {selectedGroups.map((sg) => {
        const groupName =
          setGroups.find((g) => g._id === sg.group)?.name || sg.group;
        const attrCount = sg.attributes.length;
        const hasAttributes = attrCount > 0;

        return (
          <div
            key={sg.group}
            className="ml-4 p-3 border-l-2 border-blue-300 bg-gray-50 rounded-r"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleExpand(sg.group)}
                className="font-medium text-sm flex items-center gap-2 hover:text-blue-600"
              >
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
              </button>
              {!hasAttributes && (
                <span className="text-xs text-red-500 font-medium">
                  ⚠️ Select at least one
                </span>
              )}
            </div>

            {expandedGroups.has(sg.group) && (
              <div className="mt-2">
                <AttributeSelector
                  groupId={sg.group}
                  selectedAttributes={sg.attributes}
                  onUpdate={(attrs) => updateGroupAttributes(sg.group, attrs)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
