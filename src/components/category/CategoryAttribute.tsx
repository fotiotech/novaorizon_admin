'use client";'

import React, { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import { findAttributesAndValues } from "@/app/actions/attributes";

type AttributesGroup = {
  _id: string;
  name: string;
  parent_id?: string;
  category_id: string;
};

interface Option {
  value: string;
  label: string;
}

interface CategoryAttributeProps {
  toggleCreateAttribute: boolean;
  attributes: string[];
  setToggleCreateAttribute: (flag: boolean) => void;
  setAttributes: (attrs: string[]) => void;
}

const CategoryAttribute: React.FC<CategoryAttributeProps> = ({
  toggleCreateAttribute,
  attributes,
  setToggleCreateAttribute,
  setAttributes,
}) => {
  // ensure attributes is always an array
  const selectedAttributes = Array.isArray(attributes) ? attributes : [];

  const [attributeD, setAttributeD] = useState<{ _id: string; name: string, group: any }[]>(
    []
  );

  const [filterText, setFilterText] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });



  // Load attributes
  useEffect(() => {
    (async () => {
      try {
        const attrs = await findAttributesAndValues();
        console.log("attrs:", attrs);
        if (Array.isArray(attrs)) {
          setAttributeD(attrs.map((a: any) => ({ _id: a._id, name: a.name, group: a.groupId })));
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const sortOptions: Option[] = [
    { value: "asc", label: "A → Z" },
    { value: "desc", label: "Z → A" },
  ];

  const visibleAttributes = useMemo(() => {
    const filtered = attributeD.filter((a) =>
      a.name.toLowerCase().includes(filterText.toLowerCase())
    );
    const sorted = filtered.sort((a, b) =>
      sortOrder.value === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    return sorted;
  }, [attributeD, filterText, sortOrder]);

  const toggleAttribute = (name: string) => {
    if (selectedAttributes.includes(name)) {
      setAttributes(selectedAttributes.filter((n) => n !== name));
    } else {
      setAttributes([...selectedAttributes, name]);
    }
  };

  console.log("attributes:", attributes);

  return (
    <div className={`${toggleCreateAttribute ? "block" : "hidden"} mb-4`}>
      

      {/* Filter & Sort */}
      <div className="mt-4 flex flex-col md:flex-row gap-2 items-center">
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
          className="w-full md:w-1/4 dark:bg-sec-dark"
        />
      </div>

      {/* Custom attribute list */}
      <div className="mt-4">
        <label>Map Attributes:</label>
        <div className="flex flex-col gap-2 border
        border-gray-600 rounded-md p-3 h-48 my-2
        overflow-auto bg-white dark:bg-sec-dark">
          {visibleAttributes.map((attr) => (
            <div
              key={attr._id}
              onClick={() => toggleAttribute(attr._id)}
              className={` p-1 px-2
                cursor-pointer rounded hover:bg-gray-100 
                dark:hover:bg-gray-700 ${
                selectedAttributes.includes(attr._id)
                  ? "bg-blue-100 dark:bg-blue-900"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span>{attr.name}</span>
              <span className="text-sm text-gray-300">{attr.group.name}</span>
              </div>
              
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryAttribute;
