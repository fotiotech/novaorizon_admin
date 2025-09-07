"use client";

import {
  createAttributeGroup,
  findAllAttributeGroups,
  findGroup,
  updateAttributeGroup,
  deleteAttributeGroup,
} from "@/app/actions/attributegroup";
import { findAttributesAndValues } from "@/app/actions/attributes";
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";

// Types
type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  option?: string;
  type: string;
  sort_order: number;
};

type AttributesGroup = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  attributes?: string[];
  group_order: number;
  sort_order: number;
  children?: AttributesGroup[];
};

interface Option {
  value: string;
  label: string;
}

// Main Group Component
const Group = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [groups, setGroups] = useState<AttributesGroup[]>([]);
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [groupOrder, setGroupOrder] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [editGroupId, setEditGroupId] = useState<string>("");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [parentGroupId, setParentGroupId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [sortAttrOrder, setSortAttrOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [attributesResponse, groupsResponse] = await Promise.all([
          findAttributesAndValues(),
          findAllAttributeGroups(),
        ]);

        if (attributesResponse?.length > 0) {
          setAttributes(attributesResponse as unknown as AttributeType[]);
        }

        if (groupsResponse) {
          setGroups(groupsResponse as unknown as AttributesGroup[]);
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch group details when groupId or editGroupId changes
  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!groupId && !editGroupId) return;
      setIsLoading(true);
      try {
        const idToFetch = editGroupId || groupId;
        const groupResponse = await findGroup(idToFetch);
        
        if (groupResponse) {
          setCode(groupResponse.code || "");
          setName(groupResponse.name || "");
          setGroupOrder(groupResponse.group_order || null);
          setParentGroupId(groupResponse.parent_id || "");

          const currentAttributeIds =
            groupResponse.attributes?.map((attr: any) => attr._id || attr.id) ||
            [];
          setSelectedAttributes(currentAttributeIds);
        }
      } catch (err) {
        console.error("Error fetching group:", err);
        setError(err instanceof Error ? err.message : "Failed to load group");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupDetails();
  }, [groupId, editGroupId]);

  // Handle saving group (create or update)
  const handleSaveGroup = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;

      if (editGroupId) {
        const data = {
          name,
          code,
          parent_id: parentGroupId,
          attributes: selectedAttributes,
          group_order: groupOrder as number,
        };
        response = await updateAttributeGroup(editGroupId, data);
      } else {
        response = await createAttributeGroup(
          action,
          groupId,
          name,
          code,
          parentGroupId,
          selectedAttributes,
          groupOrder as number
        );
      }

      if (response) {
        setSuccess(
          editGroupId
            ? "Group updated successfully!"
            : "Group created successfully!"
        );

        // Refresh groups list
        const res = await findAllAttributeGroups();
        setGroups(res as unknown as AttributesGroup[]);

        // Reset form if it was a create action
        if (!editGroupId) {
          resetForm();
        }
      }
    } catch (err) {
      console.error("Error saving group:", err);
      setError(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a group
  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    setIsLoading(true);
    try {
      await deleteAttributeGroup(id);
      setSuccess("Group deleted successfully!");

      // Refresh groups list
      const res = await findAllAttributeGroups();
      setGroups(res as unknown as AttributesGroup[]);

      // If the deleted group was selected, reset the form
      if (groupId === id || editGroupId === id) {
        resetForm();
        setGroupId("");
        setEditGroupId("");
        setAction("");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle attribute selection
  const handleAttributeToggle = (attributeId: string) => {
    setSelectedAttributes((prev) =>
      prev.includes(attributeId)
        ? prev.filter((id) => id !== attributeId)
        : [...prev, attributeId]
    );
  };

  // Reset form fields
  const resetForm = () => {
    setName("");
    setCode("");
    setGroupOrder(null);
    setParentGroupId("");
    setSelectedAttributes([]);
  };

  // Toggle group expansion in overview
  const toggleGroupExpansion = (id: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Sort options for attributes
  const sortOptions: Option[] = [
    { value: "asc", label: "A → Z" },
    { value: "desc", label: "Z → A" },
  ];

  // Filter and sort attributes based on user input
  const visibleAttributes = useMemo(() => {
    const filtered = attributes.filter(
      (a) =>
        a.name.toLowerCase().includes(filterText.toLowerCase()) ||
        a.code.toLowerCase().includes(filterText.toLowerCase())
    );
    const sorted = filtered.sort((a, b) =>
      sortAttrOrder.value === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    return sorted;
  }, [attributes, filterText, sortAttrOrder]);

  // Get the current group being edited/viewed
  const currentGroup = useMemo(() => {
    return groups.find((g) => g._id === (editGroupId || groupId));
  }, [groups, editGroupId, groupId]);

  // Recursive function to render groups with children
  const renderGroupWithChildren = (group: AttributesGroup, level = 0) => {
    const hasChildren = group.children && group.children.length > 0;
    const isExpanded = expandedGroups.has(group._id);
    const isSelected = group._id === groupId || group._id === editGroupId;

    return (
      <div key={group._id} className={`mb-3 ${level > 0 ? "ml-6" : ""}`}>
        <div
          className={`p-4 border rounded-lg ${
            isSelected
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center">
                {hasChildren && (
                  <button
                  type="button"
                    onClick={() => toggleGroupExpansion(group._id)}
                    className="mr-2 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200"
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                )}
                <div>
                  <h4 className="font-medium">{group.name}</h4>
                  <p className="text-sm text-gray-500">{group.code}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Order: {group.group_order} | Attributes:{" "}
                    {group.attributes?.length || 0}
                    {group.parent_id &&
                      ` | Parent: ${
                        groups.find((g) => g._id === group.parent_id)?.name ||
                        group.parent_id
                      }`}
                  </p>
                </div>
              </div>

              {group.attributes && group.attributes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Attributes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.attributes.slice(0, 3).map((attrId) => {
                      const attr = attributes.find((a) => a._id === attrId);
                      return attr ? (
                        <span
                          key={attrId}
                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {attr.name}
                        </span>
                      ) : null;
                    })}
                    {group.attributes.length > 3 && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        +{group.attributes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setAction("add attributes");
                  setGroupId(group?._id);
                }}
                className="text-sm text-blue-500 hover:text-blue-700"
                title="Add attributes"
              >
                + Attributes
              </button>
              <button
                type="button"
                onClick={() => {
                  setAction("edit");
                  setEditGroupId(group?._id);
                }}
                className="text-sm text-blue-500 hover:text-blue-700"
                title="Edit group"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(group._id)}
                className="text-sm text-red-500 hover:text-red-700"
                title="Delete group"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2">
            {group.children!.map((child) =>
              renderGroupWithChildren(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto lg:px-8 w-full">
      <h2 className="font-bold text-2xl my-4">Attribute Groups Management</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Success:</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="lg:col-span-1 space-y-4">
          {(action === "create" || action === "edit") && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium mb-3 flex items-center justify-between">
                {editGroupId ? "Edit Group" : "Create New Group"}
                {editGroupId && (
                  <button
                    onClick={() => {
                      setEditGroupId("");
                      resetForm();
                      setAction("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel Edit
                  </button>
                )}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Parent Group
                  </label>
                  <select
                    title="parent"
                    value={parentGroupId}
                    onChange={(e) => setParentGroupId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No parent (root group)</option>
                    {groups
                      .filter((group) => group._id !== (editGroupId || groupId))
                      .map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Group Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g., name_top10"
                    className="w-full p-2 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter group name"
                    className="w-full p-2 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Group Order
                  </label>
                  <input
                    type="number"
                    value={groupOrder === null ? "" : groupOrder}
                    onChange={(e) =>
                      setGroupOrder(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    placeholder="Order number"
                    className="w-full p-2 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveGroup}
                  disabled={isLoading || !name || !code}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  ) : editGroupId ? (
                    "Update Group"
                  ) : (
                    "Create Group"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attributes Selection and Groups Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attributes Selection */}
          {action === "add attributes" && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium mb-3">Assign Attributes to Group</h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Selected: {selectedAttributes.length} attributes
                  {currentGroup && ` for "${currentGroup.name}"`}
                </p>
              </div>

              <div className="mb-4 flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Filter attributes by name or code..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="flex-1 p-2 rounded-lg bg-gray-50 border border-gray-300"
                />
                <Select
                  options={sortOptions}
                  value={sortAttrOrder}
                  onChange={(opt) => setSortAttrOrder(opt as Option)}
                  className="w-full md:w-40"
                  classNames={{
                    control: () => "!bg-gray-50 !border-gray-300 !rounded-lg",
                  }}
                />
              </div>

              <div className="h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {visibleAttributes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {filterText
                      ? "No attributes match your search"
                      : "No attributes available"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {visibleAttributes.map((attr) => (
                      <div
                        key={attr._id}
                        className="flex items-center gap-2 py-1"
                      >
                        <input
                          type="checkbox"
                          id={`attr-${attr._id}`}
                          checked={selectedAttributes.includes(attr._id || "")}
                          onChange={() => handleAttributeToggle(attr._id || "")}
                          className={`${
                            selectedAttributes.includes(attr?._id as string)
                              ? "text-blue-600"
                              : ""
                          } "h-4 w-4  rounded focus:ring-blue-400"`}
                        />
                        <label
                          htmlFor={`attr-${attr._id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className="font-medium">{attr.name}</span>
                          <span className="text-gray-500 ml-2">
                            ({attr.code})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={handleSaveGroup}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Attributes"}
                </button>
              </div>
            </div>
          )}

          {/* Groups Overview with Children */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">All Groups</h3>
              <button
                onClick={() => {
                  setAction("create");
                  setEditGroupId("");
                  resetForm();
                }}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
              >
                + New Group
              </button>
            </div>

            {groups.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No groups created yet
              </p>
            ) : (
              <div>
                {groups
                  .filter((group) => !group.parent_id) // Show only root groups initially
                  .map((group) => renderGroupWithChildren(group))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Group;
