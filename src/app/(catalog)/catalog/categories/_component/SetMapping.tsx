"use client";

import React, { useState, useEffect } from "react";
import Select from "react-select";
import { getGroupsBySet } from "@/app/actions/category";
import GroupSelector from "./GroupSelector";

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

interface Mapping {
  set: string;
  groups: {
    group: string;
    attributes: {
      attribute: string;
      isRequired: boolean;
    }[];
  }[];
}

interface Props {
  index: number;
  mapping: Mapping;
  allSets: AttributeSetOption[];
  onUpdate: (newMapping: Mapping) => void;
  onRemove: () => void;
}

export default function SetMapping({
  index,
  mapping,
  allSets,
  onUpdate,
  onRemove,
}: Props) {
  const [availableGroups, setAvailableGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(false);

  // When set changes, fetch its groups
  useEffect(() => {
    if (mapping.set) {
      setLoading(true);
      getGroupsBySet(mapping.set)
        .then((groups) => setAvailableGroups(groups))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setAvailableGroups([]);
    }
  }, [mapping.set]);

  const handleSetChange = (selected: any) => {
    onUpdate({
      ...mapping,
      set: selected ? selected.value : "",
      groups: [], // reset groups when set changes
    });
  };

  const handleGroupsUpdate = (groups: Mapping["groups"]) => {
    onUpdate({ ...mapping, groups });
  };

  const setOptions = allSets.map((s) => ({
    value: s._id,
    label: `${s.title} (${s.code})`,
  }));

  const selectedSet = setOptions.find((opt) => opt.value === mapping.set);

  return (
    <div className="border p-4 rounded-md my-4 relative bg-gray-50">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
      >
        ✕
      </button>

      <h4 className="font-medium mb-2">Set #{index + 1}</h4>

      <div className="mb-4">
        <label className="block text-sm font-medium">Select Set *</label>
        <Select
          options={setOptions}
          value={selectedSet}
          onChange={handleSetChange}
          placeholder="Choose a set..."
          isClearable
          className="mt-1"
        />
      </div>

      {mapping.set && (
        <div>
          <label className="block text-sm font-medium">
            Select Groups & Attributes
          </label>
          <GroupSelector
            setGroups={availableGroups}
            selectedGroups={mapping.groups}
            onUpdate={handleGroupsUpdate}
            isLoading={loading}
          />
        </div>
      )}
    </div>
  );
}
