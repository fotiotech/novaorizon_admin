"use client";

import React, { useState, useEffect } from "react";
import { getAttributesByGroup } from "@/app/actions/category";
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
  const [groupAttributes, setGroupAttributes] = useState<Record<string, any[]>>(
    {},
  );

  // Load attributes for each selected group
  useEffect(() => {
    const fetchAll = async () => {
      const map: Record<string, any[]> = {};
      for (const sg of selectedGroups) {
        if (!map[sg.group]) {
          const attrs = await getAttributesByGroup(sg.group);
          map[sg.group] = attrs;
        }
      }
      setGroupAttributes(map);
    };
    fetchAll();
  }, [selectedGroups]);

  const toggleGroup = (groupId: string) => {
    const exists = selectedGroups.find((g) => g.group === groupId);
    if (exists) {
      onUpdate(selectedGroups.filter((g) => g.group !== groupId));
    } else {
      onUpdate([...selectedGroups, { group: groupId, attributes: [] }]);
    }
  };

  const updateGroupAttributes = (
    groupId: string,
    attributes: { attribute: string; isRequired: boolean }[],
  ) => {
    const updated = selectedGroups.map((g) =>
      g.group === groupId ? { ...g, attributes } : g,
    );
    onUpdate(updated);
  };

  if (isLoading) return <div>Loading groups...</div>;

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
              className={`px-3 py-1 rounded-full border ${
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

      {selectedGroups.map((sg) => (
        <div key={sg.group} className="ml-4 p-2 border-l-2 border-blue-300">
          <div className="font-medium text-sm">
            {setGroups.find((g) => g._id === sg.group)?.name}:
          </div>
          <AttributeSelector
            groupId={sg.group}
            selectedAttributes={sg.attributes}
            onUpdate={(attrs) => updateGroupAttributes(sg.group, attrs)}
          />
        </div>
      ))}
    </div>
  );
}
