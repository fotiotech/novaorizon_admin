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
    const exists = selectedAttributes.find((a) => a.attribute === attrId);
    if (exists) {
      onUpdate(selectedAttributes.filter((a) => a.attribute !== attrId));
    } else {
      onUpdate([
        ...selectedAttributes,
        { attribute: attrId, isRequired: false },
      ]);
    }
  };

  const toggleRequired = (attrId: string) => {
    onUpdate(
      selectedAttributes.map((a) =>
        a.attribute === attrId ? { ...a, isRequired: !a.isRequired } : a,
      ),
    );
  };

  if (loading)
    return <div className="text-sm text-gray-500">Loading attributes...</div>;

  return (
    <div className="flex flex-wrap gap-4 mt-1">
      {attributes.map((attr) => {
        const selected = selectedAttributes.find(
          (a) => a.attribute === attr._id,
        );
        return (
          <div key={attr._id} className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={!!selected}
                onChange={() => toggleAttribute(attr._id)}
                className="form-checkbox"
              />
              <span className="text-sm">{attr.name}</span>
            </label>
            {selected && (
              <label className="flex items-center space-x-1 text-sm">
                <input
                  type="checkbox"
                  checked={selected.isRequired}
                  onChange={() => toggleRequired(attr._id)}
                  className="form-checkbox"
                />
                <span className="text-xs text-gray-500">Required</span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
