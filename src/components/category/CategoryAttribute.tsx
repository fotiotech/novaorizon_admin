"use client";

import React, { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import { findAttributesAndValues } from "@/app/actions/attributes";
import {
  create_update_mapped_attributes_ids,
  find_mapped_attributes_ids,
  getCategory,
} from "@/app/actions/category";
import {
  findAllAttributeGroups,
  findAttributeForGroups,
} from "@/app/actions/attributegroup";

type AttributeGroup = {
  _id: string;
  name: string;
  parent_id?: string;
  attributes: string[] | [{ name: string; _id?: string }];
};

interface Option {
  value: string;
  label: string;
}

interface CategoryAttributeProps {
  toggleCreateAttribute: boolean;
  attributes: string[];
  handleSubmit: (e: React.FormEvent) => void;
  setAttributes: (attrs: string[]) => void;
  categoryId?: string;
}

const CategoryAttribute: React.FC<CategoryAttributeProps> = ({
  toggleCreateAttribute,
  attributes,
  handleSubmit,
  setAttributes,
  categoryId,
}) => {
  const selectedAttributes = Array.isArray(attributes) ? attributes : [];

  const [attributeGroups, setAttributeGroups] = useState<
    AttributeGroup[] | null
  >([{ _id: "", name: "", attributes: [{ name: "", _id: "" }] }]);

  const [filterText, setFilterText] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [mappedAttributes, setMappedAttributes] = useState<any>([]);

  useEffect(() => {
    (async () => {
      try {
        const allAttributeGroups = await findAttributeForGroups();
        if (Array.isArray(allAttributeGroups)) {
          setAttributeGroups(allAttributeGroups as AttributeGroup[]);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    async function fetchMappedAttributes() {
      if (!categoryId) {
        console.error("Category ID is required");
        return;
      }
      const res = await find_mapped_attributes_ids(categoryId);
      if (res) {
        setMappedAttributes(res);
      }
    }

    fetchMappedAttributes();
  }, [categoryId]);

  const sortOptions: Option[] = [
    { value: "asc", label: "A → Z" },
    { value: "desc", label: "Z → A" },
  ];

  const visibleAttributes = useMemo(() => {
    const allAttributes =
      attributeGroups?.map((g) => ({
        _id: g._id,
        name: g.name,
        attributes: g.attributes.map((a) => ({
          ...(a as { name: string; _id?: string }),
        })),
      })) || [];

    const filteredGroups = allAttributes
      .filter(
        (group) =>
          group.name.toLowerCase().includes(filterText.toLowerCase()) ||
          group.attributes.some((a) =>
            a.name?.toLowerCase().includes(filterText.toLowerCase())
          )
      )
      .map((group) => ({
        ...group,
        attributes: group.attributes.filter((a) =>
          a.name?.toLowerCase().includes(filterText.toLowerCase())
        ),
      }));

    const sortedGroups = filteredGroups.map((group) => ({
      ...group,
      attributes: group.attributes.sort((a, b) =>
        sortOrder.value === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      ),
    }));

    return sortedGroups;
  }, [attributeGroups, filterText, sortOrder]);

  const toggleAttribute = (id: string) => {
    if (selectedAttributes.includes(id)) {
      setAttributes(selectedAttributes.filter((n) => n !== id));
    } else {
      setAttributes([...selectedAttributes, id]);
    }
  };

  return (
    <div className={`${toggleCreateAttribute ? "block" : "hidden"} mb-4`}>
      {/* Filter & Sort */}
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

      {/* Custom attribute list */}
      <div className="mt-4">
        <label>Map Attributes:</label>
        <div className="flex flex-col gap-2 border border-gray-600 rounded-md p-3 h-80 my-2 overflow-auto bg-white dark:bg-sec-dark">
          {visibleAttributes?.map((g) => (
            <div key={g._id} className="p-1 px-2 cursor-pointer rounded">
              <h3 className="font-bold text-lg mb-2">{g.name}</h3>
              {g.attributes.map((attr: any) => (
                <div
                  key={attr?._id}
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
      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} className="btn block my-2">
          Map Attributes
        </button>
      </div>

      {/* Mapped attributes */}
      {mappedAttributes && (
        <div className="flex flex-col gap-2 ">
          <h3 className="text-lg font-bold">Mapped Attributes:</h3>
          <ul className="list-disc pl-5 h-60 overflow-y-auto">
            {mappedAttributes.map((group: any) => (
              <div
                key={group._id}
                className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg "
              >
                <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100">
                  {group.name}
                </h3>
                <ul className="list-disc pl-5">
                  {group.attributes.map((attr: any) => (
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
