// GroupManagement.tsx
"use client";

import React, { useMemo, useState } from "react";
import Select from "react-select";
import {
  updateAttributeGroup,
  findAttributeForGroups,
} from "@/app/actions/attributegroup";

interface Option {
  value: string;
  label: string;
}

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

interface GroupManagementProps {
  groups: Group[];
  allAttributes: AttributeType[];
  isLoading: boolean;
}

const GroupManagement: React.FC<GroupManagementProps> = ({
  groups,
  allAttributes,
  isLoading: parentLoading,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [attributesToRemove, setAttributesToRemove] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle adding attributes to a group
  const handleAddAttributesToGroup = async (attributeIds: string[]) => {
    if (!selectedGroup) return;

    try {
      setIsLoading(true);

      // Get current attribute IDs
      const currentAttrIds = selectedGroup.attributes
        .map((attr) => (typeof attr === "string" ? attr : attr._id))
        .filter((id): id is string => id !== undefined);

      // Combine with new attributes
      const updatedAttrIds = [...currentAttrIds, ...attributeIds];

      // Update group
      await updateAttributeGroup(selectedGroup._id, {
        attributes: updatedAttrIds,
      });

      // Refresh groups
      const updatedGroups = await findAttributeForGroups();
      if (Array.isArray(updatedGroups)) {
        // Update selected group
        const updatedGroup = updatedGroups.find(
          (g) => g._id === selectedGroup._id
        );
        if (updatedGroup) setSelectedGroup(updatedGroup as Group);
      }

      alert("Attributes added to group successfully!");
    } catch (err) {
      console.error("Error adding attributes to group:", err);
      alert("Failed to add attributes to group");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle removing attributes from a group
  const handleRemoveAttributesFromGroup = async (attributeIds: string[]) => {
    if (!selectedGroup) return;

    try {
      setIsLoading(true);

      // Get current attribute IDs
      const currentAttrIds = selectedGroup.attributes
        .map((attr) => (typeof attr === "string" ? attr : attr._id))
        .filter((id): id is string => id !== undefined);

      // Remove specified attributes
      const updatedAttrIds = currentAttrIds.filter(
        (id) => !attributeIds.includes(id)
      );

      // Update group
      await updateAttributeGroup(selectedGroup._id, {
        attributes: updatedAttrIds,
      });

      // Refresh groups
      const updatedGroups = await findAttributeForGroups();
      if (Array.isArray(updatedGroups)) {
        // Update selected group
        const updatedGroup = updatedGroups.find(
          (g) => g._id === selectedGroup._id
        );
        if (updatedGroup) setSelectedGroup(updatedGroup as Group);
      }

      alert("Attributes removed from group successfully!");
    } catch (err) {
      console.error("Error removing attributes from group:", err);
      alert("Failed to remove attributes from group");
    } finally {
      setIsLoading(false);
    }
  };

  // Get attributes that are not in the selected group
  const availableAttributes = useMemo(() => {
    if (!selectedGroup) return allAttributes;

    const groupAttributeIds = new Set();
    selectedGroup.attributes.forEach((attr) => {
      if (typeof attr === "string") {
        groupAttributeIds.add(attr);
      } else if (attr._id) {
        groupAttributeIds.add(attr._id);
      }
    });

    return allAttributes
      .filter((attr) => !groupAttributeIds.has(attr._id))
      .filter((attr) =>
        attr.name?.toLowerCase().includes(filterText.toLowerCase())
      )
      .sort((a, b) =>
        sortOrder.value === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
  }, [selectedGroup, allAttributes, filterText, sortOrder]);

  // Get attributes for the selected group
  const groupAttributes = useMemo(() => {
    if (!selectedGroup) return [];

    const attributeIds = selectedGroup.attributes
      .map((attr) => (typeof attr === "string" ? attr : attr._id))
      .filter((id): id is string => id !== undefined);

    return allAttributes
      .filter((attr) => attributeIds.includes(attr._id || ""))
      .filter((attr) =>
        attr.name?.toLowerCase().includes(filterText.toLowerCase())
      )
      .sort((a, b) =>
        sortOrder.value === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
  }, [selectedGroup, allAttributes, filterText, sortOrder]);

  const toggleAttributeSelection = (attrId: string, isAvailable: boolean) => {
    if (isAvailable) {
      // Toggle selection in available attributes
      if (selectedAttributes.includes(attrId)) {
        setSelectedAttributes(selectedAttributes.filter((id) => id !== attrId));
      } else {
        setSelectedAttributes([...selectedAttributes, attrId]);
      }
    } else {
      // Toggle selection in group attributes (for removal)
      if (attributesToRemove.includes(attrId)) {
        setAttributesToRemove(attributesToRemove.filter((id) => id !== attrId));
      } else {
        setAttributesToRemove([...attributesToRemove, attrId]);
      }
    }
  };

  const handleSaveChanges = () => {
    if (selectedAttributes.length > 0) {
      handleAddAttributesToGroup(selectedAttributes);
      setSelectedAttributes([]);
    }

    if (attributesToRemove.length > 0) {
      handleRemoveAttributesFromGroup(attributesToRemove);
      setAttributesToRemove([]);
    }
  };

  return (
    <div className="mb-8 p-2 lg:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        Group Management
      </h2>

      {/* Select Group */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Group:
        </label>
        <Select
          options={groups.map((group) => ({
            value: group._id,
            label: group.name,
          }))}
          value={
            selectedGroup
              ? { value: selectedGroup._id, label: selectedGroup.name }
              : null
          }
          onChange={(selected) => {
            const group = groups.find((g) => g._id === selected?.value);
            setSelectedGroup(group || null);
            setSelectedAttributes([]);
            setAttributesToRemove([]);
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

      {selectedGroup && (
        <>
          {/* Filter & Sort */}
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter attributes:
              </label>
              <input
                type="text"
                placeholder="Type to filter..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort order:
              </label>
              <Select
                options={[
                  { value: "asc", label: "A → Z" },
                  { value: "desc", label: "Z → A" },
                ]}
                value={sortOrder}
                onChange={(opt) => setSortOrder(opt as Option)}
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
          </div>

          {/* Group Attributes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Available Attributes */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Available Attributes
              </h3>
              <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 h-80 overflow-auto bg-white dark:bg-gray-800">
                {availableAttributes.map((attr) => (
                  <div
                    key={attr._id}
                    className={`p-2 mb-1 rounded cursor-pointer transition-colors ${
                      selectedAttributes.includes(attr._id || "")
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={() =>
                      toggleAttributeSelection(attr._id || "", true)
                    }
                  >
                    <div className="flex items-center">
                      <span
                        className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${
                          selectedAttributes.includes(attr._id || "")
                            ? "bg-blue-500 border-blue-500"
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
                {availableAttributes.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No attributes available
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    const allIds = availableAttributes.map(
                      (attr) => attr._id || ""
                    );
                    setSelectedAttributes(allIds);
                  }}
                  disabled={isLoading || availableAttributes.length === 0}
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

            {/* Group Attributes */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Group Attributes
              </h3>
              <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 h-80 overflow-auto bg-white dark:bg-gray-800">
                {groupAttributes.map((attr) => (
                  <div
                    key={attr._id}
                    className={`p-2 mb-1 rounded cursor-pointer transition-colors ${
                      attributesToRemove.includes(attr._id || "")
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={() =>
                      toggleAttributeSelection(attr._id || "", false)
                    }
                  >
                    <div className="flex items-center">
                      <span
                        className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${
                          attributesToRemove.includes(attr._id || "")
                            ? "bg-red-500 border-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        {attributesToRemove.includes(attr._id || "") && (
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
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        )}
                      </span>
                      <span>{attr.name}</span>
                    </div>
                  </div>
                ))}
                {groupAttributes.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No attributes in this group
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    const allIds = groupAttributes.map(
                      (attr) => attr._id || ""
                    );
                    setAttributesToRemove(allIds);
                  }}
                  disabled={isLoading || groupAttributes.length === 0}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => setAttributesToRemove([])}
                  disabled={isLoading || attributesToRemove.length === 0}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveChanges}
              disabled={
                isLoading ||
                (selectedAttributes.length === 0 &&
                  attributesToRemove.length === 0)
              }
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
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupManagement;