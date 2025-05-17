"use client";

import {
  createAttributeGroup,
  findAllAttributeGroups,
} from "@/app/actions/attributegroup";
import {
  createAttribute,
  deleteAttribute,
  findAttributesAndValues,
  updateAttribute,
} from "@/app/actions/attributes";
import { Delete, Edit } from "@mui/icons-material";
import React, { useEffect, useState } from "react";

// Update the AttributeType interface to include isVariant
type AttributeType = {
  _id?: string;
  id?: string;
  groupId?: any;
  name: string;
  type: string;

  isVariant?: boolean;
};

// Update the AttributesGroup type
type AttributesGroup = {
  _id: string;
  name: string;
  parent_id: string;
  group_order: number;
  sort_order: number;
};

type EditingAttributeType = {
  id: string;
  name: string;
  type: string;
  groupId?: string;
  isVariant: boolean;
};

const Attributes = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [formData, setFormData] = useState<AttributeType[]>([
    { name: "", type: "" },
  ]);
  const [groups, setGroups] = useState<AttributesGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [groupOrder, setGroupOrder] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [groupId, setGroupId] = useState<string>("");
  const [editingAttribute, setEditingAttribute] =
    useState<EditingAttributeType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await findAttributesAndValues();
        if (response?.length > 0) {
          setAttributes(response as unknown as AttributeType[]);
          setError(null); // Clear any previous errors on success
        }
      } catch (err) {
        console.error("[Attributes] Error fetching data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load attributes"
        );
      }
    };

    async function getGroups() {
      try {
        const groupResponse = await findAllAttributeGroups();
        console.log("[Attributes] Group response:", groupResponse);
        if (groupResponse) {
          setGroups(groupResponse as unknown as AttributesGroup[]);
          setError(null);
        } else {
          setError("No attribute groups found");
        }
      } catch (err) {
        console.error("[Attributes] Error fetching groups:", err);
        setError(err instanceof Error ? err.message : "Failed to load groups");
      }
    }

    fetchData();
    getGroups();
  }, []);

  function addAttributes() {
    setFormData((prev) => [...prev, { name: "", type: "" }]);
  }

  const handleInputChange = (
    index: number,
    field: keyof AttributeType,
    value: string | boolean
  ) => {
    setFormData((prev) =>
      prev.map((attr, i) =>
        i === index
          ? {
              ...attr,
              name: field === "name" ? (value as string) : attr.name,
              type: field === "type" ? (value as string) : attr.type,
              isVariant:
                field === "isVariant" ? (value as boolean) : attr.isVariant,
            }
          : attr
      )
    );
  };

  const handleCreateGroup = async () => {
    if (newGroupName.trim() === "") return;

    const response = await createAttributeGroup(
      newGroupName,
      groupId,
      groupOrder,
      sortOrder
    );
    if (response) {
      setNewGroupName("");
      // Refresh groups list
      const groupResponse = await findAllAttributeGroups();
      setGroups(groupResponse as unknown as AttributesGroup[]);
    }
  };

  const manageAttribute = async (
    action: string,
    id?: string,
    attrOrVal?: string,
    updateData?: any
  ) => {
    try {
      if (action === "create") {
        // Validate form data
        const invalidAttributes = formData.filter(
          (attr) => !attr.name.trim() || !attr.type.trim()
        );
        if (invalidAttributes.length > 0) {
          setError(
            "Name and at least one value are required for all attributes"
          );
          return;
        }

        const attributeData = {
          groupId: groupId || "",
          names: formData.map((attr) => attr.name.trim()),
          type: formData.map((attr) => (attr.type.trim() ? attr.type : "text")),
          isVariants: formData.map((attr) => Boolean(attr.isVariant)),
        };

        console.log(
          "[Attributes] Creating attributes with data:",
          attributeData
        );

        try {
          await createAttribute(attributeData);
          console.log("[Attributes] Successfully created attributes");
          // Reset form after successful creation
          setFormData([{ name: "", type: "" }]);
          setError(null);

          // Refresh attribute list
          const response = await findAttributesAndValues();
          if (response?.length > 0) {
            setAttributes(response as unknown as AttributeType[]);
            setError(null); // Clear any previous errors on success
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to create attributes";
          console.error("[Attributes] Error creating attributes:", err);
          setError(errorMessage);
          return;
        }
      } else if (action === "delete") {
        if (attrOrVal === "attribute" && id) {
          await deleteAttribute(id);
        }
      } else if (action === "update") {
        if (attrOrVal === "attribute" && id && updateData) {
          if (!updateData.name.trim()) {
            setError("Attribute name cannot be empty");
            return;
          }
          await updateAttribute(id, {
            name: updateData.name.trim(),
            type: updateData.type.trim(),
            groupId: updateData.groupId,
            isVariant: updateData.isVariant,
          });
        }
      }

      // Refresh the attributes list after successful operation

      const response = await findAttributesAndValues();
      if (response?.length > 0) {
        setAttributes(response as unknown as AttributeType[]);
        setError(null); // Clear any previous errors on success
      }
    } catch (error) {
      console.error("[Attributes] Error managing attribute:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while managing attributes"
      );
    }
  };

  const handleUpdateAttribute = async (
    id: string,
    name: string,
    type: string,
    groupId: string,
    isVariant: boolean
  ) => {
    try {
      await manageAttribute("update", id, "attribute", {
        name,
        type,
        groupId,
        isVariant,
      });
      setEditingAttribute(null);

      // Refresh attributes list after update
      const response = await findAttributesAndValues();
      if (response?.length > 0) {
        setAttributes(response as unknown as AttributeType[]);
        setError(null); // Clear any previous errors on success
      }
    } catch (error) {
      console.error("Error updating attribute:", error);
    }
  };

  const handleEditClick = (attr: AttributeType) => {
    if (attr._id) {
      setEditingAttribute({
        id: attr?._id || "",
        name: attr.name,
        type: attr.type || "",
        isVariant: attr.isVariant || false,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <h2 className="font-bold text-xl my-2">Attributes</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Category Selection */}
      <div className="grid gap-4 mb-6">
        {/* Group Selection */}
        <div className="w-full space-y-4">
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
            <label htmlFor="group" className="whitespace-nowrap">
              Group:
            </label>
            <select
              id="group"
              title="group"
              name="groupId"
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
              }}
              className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            >
              <option value="">Select or Create New Group</option>
              {groups?.length > 0 &&
                groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              <option value="create">Create New Group</option>
            </select>
          </div>

          {groupId === "create" && (
            <div className="space-y-4 pl-0 md:pl-4">
              <select
                title="group"
                name="groupId"
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value);
                }}
                className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
              >
                <option value="">Select parent group</option>
                {groups?.length > 0 &&
                  groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
              </select>

              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  name="newGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter new group name"
                  className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
                <input
                  type="number"
                  name="groupOrder"
                  value={groupOrder}
                  onChange={(e) => setGroupOrder(Number(e.target.value))}
                  placeholder="Enter new group order"
                  className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
                <input
                  type="number"
                  name="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  placeholder="Enter new group name"
                  className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="btn text-sm w-full md:w-auto"
                >
                  Create Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attributes Creation Form */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <p className="text-lg">Create Attributes:</p>
          <button onClick={addAttributes} type="button" className="btn text-sm">
            Add new property
          </button>
        </div>

        <div className="space-y-4">
          {formData.map((attr, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <label htmlFor={`name-${index}`} className="block mb-1">
                  Name:
                </label>
                <input
                  id={`name-${index}`}
                  type="text"
                  name={`name-${index}`}
                  value={attr.name}
                  onChange={(e) =>
                    handleInputChange(index, "name", e.target.value)
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
              </div>
              <div>
                <label htmlFor={`values-${index}`} className="block mb-1">
                  type:
                </label>
                <select
                  id={`values-${index}`}
                  name={`values-${index}`}
                  value={attr.type}
                  onChange={(e) =>
                    handleInputChange(index, "type", e.target.value)
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                >
                  <option value="text">text</option>
                  <option value="select">select</option>
                  <option value="checkbox">checkbox</option>
                  <option value="boolean">boolean</option>
                  <option value="radio">radio</option>
                  <option value="textarea">textarea</option>
                  <option value="number">number</option>
                  <option value="date">date</option>
                  <option value="color">color</option>
                  <option value="file">file</option>
                  <option value="url">url</option>
                  <option value="multi-select">multi-select</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`isVariant-${index}`}>Is Variant:</label>
                <input
                  id={`isVariant-${index}`}
                  type="checkbox"
                  name={`isVariant-${index}`}
                  checked={attr.isVariant || false}
                  onChange={(e) =>
                    handleInputChange(index, "isVariant", e.target.checked)
                  }
                  className="w-4 h-4"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => manageAttribute("create")}
            className="btn"
          >
            Save All & Submit
          </button>
        </div>
      </div>

      {/* Attributes List */}
      <div>
        <h3 className="font-bold text-lg mb-4">Attributes List</h3>
        <ul className="grid gap-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
          {attributes.map((attr) => (
            <li
              key={`${attr.name}-${attr._id || "nogroup"}`}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-300">{attr.name} </span>
                  <span>{attr?.groupId?.name}</span>
                  <span
                    onClick={() => handleEditClick(attr)}
                    className="cursor-pointer"
                  >
                    <Edit fontSize="small" />
                  </span>
                </div>
                <button
                  onClick={() =>
                    manageAttribute("delete", attr.name, "attribute")
                  }
                  className="text-red-500 hover:text-red-700"
                  aria-label={`Delete attribute ${attr.name}`}
                >
                  <Delete />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  {editingAttribute && editingAttribute.id === attr._id && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editingAttribute.name}
                        onChange={(e) =>
                          setEditingAttribute({
                            ...editingAttribute,
                            name: e.target.value,
                          })
                        }
                        className="p-1 rounded bg-none border dark:bg-gray-400"
                        title="Edit attribute name"
                        placeholder="Enter attribute name"
                        aria-label="Edit attribute name"
                      />
                      <select
                        title="Selected attribute type"
                        value={editingAttribute.type}
                        onChange={(e) =>
                          setEditingAttribute({
                            ...editingAttribute,
                            type: e.target.value,
                          })
                        }
                        className="p-1 rounded bg-gray-400 dark:bg-gray-700 w-44"
                        aria-label="Selected attribute type"
                      >
                        <option value="text">text</option>
                        <option value="select">select</option>
                        <option value="checkbox">checkbox</option>
                        <option value="boolean">boolean</option>
                        <option value="radio">radio</option>
                        <option value="textarea">textarea</option>
                        <option value="number">number</option>
                        <option value="date">date</option>
                        <option value="color">color</option>
                        <option value="file">file</option>
                        <option value="url">url</option>
                        <option value="multi-select">multi-select</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <p>Group:</p>
                        <select
                          value={editingAttribute.groupId}
                          onChange={(e) =>
                            setEditingAttribute({
                              ...editingAttribute,
                              groupId: e.target.value,
                            })
                          }
                          className="p-1 rounded bg-gray-400 dark:bg.gray-700 w-44"
                          title="Selected attribute group"
                          aria-label="Selected attribute group"
                        >
                          {groups.map((group) => (
                            <option key={group._id} value={group._id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`edit-isVariant-${editingAttribute.id}`}
                          className="text-sm whitespace-nowrap"
                        >
                          Is Variant:
                        </label>
                        <input
                          id={`edit-isVariant-${editingAttribute.id}`}
                          type="checkbox"
                          checked={editingAttribute.isVariant}
                          onChange={(e) =>
                            setEditingAttribute({
                              ...editingAttribute,
                              isVariant: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                          title="Mark as variant attribute"
                        />
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateAttribute(
                            editingAttribute.id,
                            editingAttribute.name,
                            editingAttribute.type,
                            editingAttribute.groupId as string,
                            editingAttribute.isVariant
                          )
                        }
                        className="btn-sm bg-green-500 hover:bg-green-600 text-white rounded px-2"
                        aria-label="Save attribute changes"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingAttribute(null)}
                        className="btn-sm bg-gray-500 hover:bg-gray-600 text-white rounded px-2"
                        aria-label="Cancel editing"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>{" "}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Attributes;
