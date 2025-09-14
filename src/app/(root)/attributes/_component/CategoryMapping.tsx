// CategoryMapping.tsx
"use client";

import React, { useMemo, useState } from "react";
import Select from "react-select";

interface Group {
  _id: string;
  name: string;
  parent_id?: string;
  attributes: string[] | { name: string; _id?: string }[];
}

interface AttributeType {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  option?: string | string[];
  type: string;
  sort_order: number;
}

interface CategoryMappingProps {
  categoryData: any[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  groups: Group[];
  allAttributes: AttributeType[];
  mappedAttributes: any[];
  onMapAttributesToCategory: (attributeIds: string[]) => void;
  onUnmapAttributesFromCategory: (attributeIds: string[]) => void;
  isLoading: boolean;
}

const CategoryMapping: React.FC<CategoryMappingProps> = ({
  categoryData,
  selectedCategoryId,
  setSelectedCategoryId,
  groups,
  allAttributes,
  mappedAttributes,
  onMapAttributesToCategory,
  onUnmapAttributesFromCategory,
  isLoading,
}) => {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

  // Get all attributes that are in any group
  const allGroupAttributes = useMemo(() => {
    const groupAttributeIds = new Set();

    groups.forEach((group) => {
      group.attributes.forEach((attr) => {
        if (typeof attr === "string") {
          groupAttributeIds.add(attr);
        } else if (attr._id) {
          groupAttributeIds.add(attr._id);
        }
      });
    });

    return allAttributes.filter((attr) => groupAttributeIds.has(attr._id));
  }, [groups, allAttributes]);

  // Get IDs of already mapped attributes
  const mappedAttributeIds = useMemo(() => {
    return mappedAttributes.flatMap((group: any) =>
      group.attributes.map((attr: any) => attr._id)
    );
  }, [mappedAttributes]);

  // Filter out already mapped attributes from available ones
  const availableGroupAttributes = useMemo(() => {
    return allGroupAttributes.filter(
      (attr) => !mappedAttributeIds.includes(attr._id || "")
    );
  }, [allGroupAttributes, mappedAttributeIds]);

  const toggleAttributeSelection = (attrId: string) => {
    if (selectedAttributes.includes(attrId)) {
      setSelectedAttributes(selectedAttributes.filter((id) => id !== attrId));
    } else {
      setSelectedAttributes([...selectedAttributes, attrId]);
    }
  };

  const handleMapAttributes = () => {
    if (selectedAttributes.length > 0) {
      onMapAttributesToCategory(selectedAttributes);
      setSelectedAttributes([]);
    }
  };

  const handleUnmapAttribute = (attributeId: string) => {
    onUnmapAttributesFromCategory([attributeId]);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        Category Mapping
      </h2>

      {/* Select Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Category:
        </label>
        <Select
          options={categoryData.map((cat) => ({
            value: cat._id,
            label: cat.name,
          }))}
          value={
            categoryData.find((cat) => cat._id === selectedCategoryId)
              ? {
                  value: selectedCategoryId,
                  label: categoryData.find(
                    (cat) => cat._id === selectedCategoryId
                  )?.name,
                }
              : null
          }
          onChange={(selected) => {
            setSelectedCategoryId(selected?.value || "");
            setSelectedAttributes([]);
          }}
          className="w-full"
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "#f9fafb",
              borderColor: "#d1d5db",
              minHeight: "42px",
            }),
          }}
        />
      </div>

      {selectedCategoryId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Available Group Attributes */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Available Group Attributes
              </h3>
              <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 h-80 overflow-auto bg-white dark:bg-gray-800">
                {groups.map((group) => (
                  <div key={group._id} className="mb-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide border-b pb-1">
                      {group.name}
                    </h4>
                    {availableGroupAttributes
                      .filter((attr) => {
                        const groupAttrIds = group.attributes
                          .map((a) => (typeof a === "string" ? a : a._id))
                          .filter((id): id is string => id !== undefined);
                        return groupAttrIds.includes(attr._id || "");
                      })
                      .map((attr) => (
                        <div
                          key={attr._id}
                          className={`p-2 mb-1 rounded cursor-pointer transition-colors ${
                            selectedAttributes.includes(attr._id || "")
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          onClick={() =>
                            toggleAttributeSelection(attr._id || "")
                          }
                        >
                          <div className="flex items-center">
                            <span
                              className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${
                                selectedAttributes.includes(attr._id || "")
                                  ? "bg-green-500 border-green-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedAttributes.includes(attr._id || "") && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                  ></path>
                                </svg>
                              )}
                            </span>
                            <span>{attr.name}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
                {availableGroupAttributes.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    All group attributes are already mapped
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    const allIds = availableGroupAttributes.map(
                      (attr) => attr._id || ""
                    );
                    setSelectedAttributes(allIds);
                  }}
                  disabled={isLoading || availableGroupAttributes.length === 0}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedAttributes([])}
                  disabled={isLoading || selectedAttributes.length === 0}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Mapped Attributes */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Mapped to Category
              </h3>
              <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 h-80 overflow-auto bg-white dark:bg-gray-800">
                {mappedAttributes.length > 0 ? (
                  mappedAttributes.map((group: any) => (
                    <div key={group._id} className="mb-4">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide border-b pb-1">
                        {group.name}
                      </h4>
                      {group.attributes?.map((attr: any) => (
                        <div
                          key={attr._id}
                          className="p-2 mb-1 rounded bg-gray-50 dark:bg-gray-700 flex justify-between items-center"
                        >
                          <span>{attr.name}</span>
                          <button
                            title="name"
                            onClick={() => handleUnmapAttribute(attr._id)}
                            disabled={isLoading}
                            className="text-red-500 hover:text-red-700 disabled:text-gray-400"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              ></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No attributes mapped to this category
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Map Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleMapAttributes}
              disabled={isLoading || selectedAttributes.length === 0}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    ></path>
                  </svg>
                  Map Selected Attributes
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryMapping;
