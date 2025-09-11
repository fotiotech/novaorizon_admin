// components/category/CategoryAttribute.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Select from "react-select";
import { findAttributeForGroups } from "@/app/actions/attributegroup";
import { find_mapped_attributes_ids } from "@/app/actions/category";

interface AttributeGroup {
  _id: string;
  name: string;
  attributes: { _id: string; name: string }[];
}

interface Option {
  value: string;
  label: string;
}

interface CategoryAttributeProps {
  categoryId?: string;
  onAttributesChange: (attributes: string[]) => void;
  selectedAttributes: string[];
}

const CategoryAttribute: React.FC<CategoryAttributeProps> = ({
  categoryId,
  onAttributesChange,
  selectedAttributes,
}) => {
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([]);
  const [filterText, setFilterText] = useState("");
  const [sortOrder, setSortOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [mappedAttributes, setMappedAttributes] = useState<AttributeGroup[]>([]);

  useEffect(() => {
    const fetchAttributeGroups = async () => {
      try {
        const allAttributeGroups = await findAttributeForGroups();
        if (Array.isArray(allAttributeGroups)) {
          setAttributeGroups(allAttributeGroups as AttributeGroup[]);
        }
      } catch (err) {
        console.error("Failed to fetch attribute groups:", err);
      }
    };

    fetchAttributeGroups();
  }, []);

  useEffect(() => {
    const fetchMappedAttributes = async () => {
      if (!categoryId) return;
      
      try {
        const res = await find_mapped_attributes_ids(categoryId);
        if (res) setMappedAttributes(res as any);
      } catch (err) {
        console.error("Failed to fetch mapped attributes:", err);
      }
    };

    fetchMappedAttributes();
  }, [categoryId]);

  const sortOptions: Option[] = [
    { value: "asc", label: "A → Z" },
    { value: "desc", label: "Z → A" },
  ];

  const visibleAttributes = useMemo(() => {
    if (!attributeGroups.length) return [];

    return attributeGroups
      .filter(
        (group) =>
          group.name.toLowerCase().includes(filterText.toLowerCase()) ||
          group.attributes.some((a) =>
            a.name.toLowerCase().includes(filterText.toLowerCase())
          )
      )
      .map((group) => ({
        ...group,
        attributes: group.attributes
          .filter((a) =>
            a.name.toLowerCase().includes(filterText.toLowerCase())
          )
          .sort((a, b) =>
            sortOrder.value === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name)
          ),
      }))
      .filter(group => group.attributes.length > 0);
  }, [attributeGroups, filterText, sortOrder]);

  const toggleAttribute = useCallback((id: string) => {
    const newAttributes = selectedAttributes.includes(id)
      ? selectedAttributes.filter((n) => n !== id)
      : [...selectedAttributes, id];
      
    onAttributesChange(newAttributes);
  }, [selectedAttributes, onAttributesChange]);

  return (
    <div className="mb-4">
      <div className="mt-4 flex md:flex-row gap-2 items-center">
        <input
          type="text"
          placeholder="Filter attributes..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full md:w-1/2 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
        />
        <Select
          options={sortOptions}
          value={sortOrder}
          onChange={(opt) => setSortOrder(opt as Option)}
          className="w-1/3 md:w-1/4 dark:bg-sec-dark"
        />
      </div>

      <div className="mt-4">
        <label>Map Attributes:</label>
        <div className="flex flex-col gap-2 border border-gray-600 rounded-md p-3 h-80 my-2 overflow-auto bg-white dark:bg-sec-dark">
          {visibleAttributes.map((group) => (
            <div key={group._id} className="p-1 px-2 cursor-pointer rounded">
              <h3 className="font-bold text-lg mb-2">{group.name}</h3>
              {group.attributes.map((attr) => (
                <div
                  key={attr._id}
                  onClick={() => toggleAttribute(attr._id)}
                  className={`flex justify-between items-center p-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedAttributes.includes(attr._id)
                      ? "bg-blue-100 dark:bg-blue-900"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{attr.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {mappedAttributes.length > 0 && (
        <div className="flex flex-col gap-2 ">
          <h3 className="text-lg font-bold">Mapped Attributes:</h3>
          <ul className="list-disc pl-5 h-60 overflow-y-auto">
            {mappedAttributes.map((group) => (
              <div
                key={group._id}
                className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg "
              >
                <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100">
                  {group.name}
                </h3>
                <ul className="list-disc pl-5">
                  {group.attributes?.map((attr) => (
                    <li
                      key={attr._id}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      {attr.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CategoryAttribute;