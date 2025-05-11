"use client";

import {
  createAttributeGroup,
  findAllAttributeGroups,
} from "@/app/actions/attributegroup";
import {
  createAttribute,
  deleteAttribute,
  deleteAttributeValue,
  findCategoryAttributesAndValues,
  updateAttribute,
  updateAttributeValue,
} from "@/app/actions/attributes";
import { getCategory } from "@/app/actions/category";
import { Category } from "@/constant/types";
import { Delete, Edit } from "@mui/icons-material";
import React, { useEffect, useState } from "react";

// Update the AttributeType interface to include isVariant
type AttributeType = {
  _id?: string;
  id?: string;
  groupName?: string;
  name: string;
  values: AttributeValueType[];
  group?: string;
  category_id?: string;
  isVariant?: boolean;
};

type AttributeValueType = {
  _id: string;
  attribute_id: string;
  value: string;
};

// Update the AttributesGroup type
type AttributesGroup = {
  _id: string;
  name: string;
  parent_id: string;
  category_id: string;
};

type EditingAttributeType = {
  id: string;
  name: string;
  group: string;
  isVariant: boolean;
};

const Attributes = () => {
  const [category, setCategory] = useState<Category[]>([]);
  const [catId, setCatId] = useState<string>("");
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [formData, setFormData] = useState<AttributeType[]>([
    { name: "", values: [] },
  ]);
  const [groups, setGroups] = useState<AttributesGroup[]>([]);
  const [isNewGroup, setIsNewGroup] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [editingAttribute, setEditingAttribute] =
    useState<EditingAttributeType | null>(null);
  const [editingValue, setEditingValue] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [newValue, setNewValue] = useState<{
    attributeId: string;
    value: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log(
          "[Attributes] Fetching categories and attributes for catId:",
          catId
        );
        const res = await getCategory();
        console.log("[Attributes] Categories fetched:", res);
        setCategory(res || []);

        if (catId) {
          const response = await findCategoryAttributesAndValues(catId);
          console.log("[Attributes] Category attributes response:", response);
          if (response?.length > 0) {
            const groups = response[0].groupedAttributes;
            console.log("[Attributes] Extracted groups:", groups);
            const formattedWithGroup = groups.flatMap((group: any) =>
              group.attributes.map((attr: any) => ({
                id: attr.id,
                name: attr.name,
                groupName: group.groupName,
                values: attr.values,
                isVariant: attr.isVariant,
              }))
            );
            console.log(
              "[Attributes] Formatted attributes:",
              formattedWithGroup
            );
            setAttributes(formattedWithGroup);
            setError(null);
          }
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
        console.log("[Attributes] Getting groups for catId:", catId);
        if (!catId) return;
        const groupResponse = await findAllAttributeGroups(catId);
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
  }, [catId]);

  function addAttributes() {
    setFormData((prev) => [...prev, { name: "", values: [] }]);
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
              [field]:
                field === "values"
                  ? (value as string)
                      .split(",")
                      .map((v) => v.trim())
                      .filter((v) => v)
                  : field === "isVariant"
                  ? Boolean(value)
                  : value,
            }
          : attr
      )
    );
  };

  const handleCreateGroup = async () => {
    if (newGroupName.trim() === "" || !catId) return;

    const response = await createAttributeGroup(newGroupName, groupId, catId);
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
      if (!catId) {
        console.error("[Attributes] Category ID is required");
        setError("Please select a category first");
        return;
      }

      console.log("[Attributes] Starting attribute action:", {
        action,
        id,
        attrOrVal,
        updateData,
      });

      if (action === "create") {
        // Validate form data
        const invalidAttributes = formData.filter(
          (attr) => !attr.name.trim() || attr.values.length === 0
        );
        if (invalidAttributes.length > 0) {
          setError(
            "Name and at least one value are required for all attributes"
          );
          return;
        }

        const attributeData = {
          catId,
          groupName: isNewGroup === "create" ? newGroupName : isNewGroup,
          names: formData.map((attr) => attr.name.trim()),
          values: formData.map((attr) =>
            attr.values
              .map((v) => (typeof v === "string" ? v : v.value))
              .filter(Boolean)
          ),
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
          setFormData([{ name: "", values: [] }]);
          setError(null);

          // Refresh attribute list
          const response = await findCategoryAttributesAndValues(catId);
          if (response?.length > 0) {
            const groups = response[0].groupedAttributes;
            const formattedWithGroup = groups.flatMap((group: any) =>
              group.attributes.map((attr: any) => ({
                id: attr.id,
                name: attr.name,
                groupName: group.groupName,
                values: attr.values,
                isVariant: attr.isVariant,
              }))
            );
            setAttributes(formattedWithGroup);
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
        } else if (attrOrVal === "value" && id) {
          await deleteAttributeValue(id);
        }
      } else if (action === "update") {
        if (attrOrVal === "attribute" && id && updateData) {
          if (!updateData.name.trim()) {
            setError("Attribute name cannot be empty");
            return;
          }
          await updateAttribute(id, {
            name: updateData.name.trim(),
            group: updateData.group,
            category_id: updateData.category_id,
            isVariant: updateData.isVariant,
          });
        } else if (attrOrVal === "value" && id && updateData) {
          if (!updateData.value.trim()) {
            setError("Value cannot be empty");
            return;
          }
          await updateAttributeValue(id, {
            value: updateData.value.trim(),
          });
        } else if (attrOrVal === "addValue" && id && updateData) {
          if (!updateData.value.trim()) {
            setError("Value cannot be empty");
            return;
          }
          await updateAttributeValue(id, {
            action: "addValue",
            value: updateData.value.trim(),
          });
        }
      }

      // Refresh the attributes list after successful operation
      if (catId) {
        const response = await findCategoryAttributesAndValues(catId);
        if (response?.length > 0) {
          const groups = response[0].groupedAttributes;
          const formattedWithGroup = groups.flatMap((group: any) =>
            group.attributes.map((attr: any) => ({
              id: attr.id,
              name: attr.name,
              groupName: group.groupName,
              values: attr.values,
              isVariant: attr.isVariant,
            }))
          );
          setAttributes(formattedWithGroup);
          setError(null); // Clear any previous errors on success
        }
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
    group: string,
    isVariant: boolean
  ) => {
    try {
      await manageAttribute("update", id, "attribute", {
        name,
        group,
        category_id: catId,
        isVariant,
      });
      setEditingAttribute(null);

      // Refresh attributes list after update
      if (catId) {
        const response = await findCategoryAttributesAndValues(catId);
        if (response?.length > 0) {
          const groups = response[0].groupedAttributes;
          const formattedWithGroup = groups.flatMap((group: any) =>
            group.attributes.map((attr: any) => ({
              id: attr.id,
              name: attr.name,
              groupName: group.groupName,
              values: attr.values,
              isVariant: attr.isVariant,
            }))
          );
          setAttributes(formattedWithGroup);
        }
      }
    } catch (error) {
      console.error("Error updating attribute:", error);
    }
  };

  const handleUpdateAttributeValue = async (id: string, value: string) => {
    try {
      await manageAttribute("update", id, "value", { value });
      setEditingValue(null);

      // Refresh attributes list after update
      if (catId) {
        const response = await findCategoryAttributesAndValues(catId);
        if (response?.length > 0) {
          const groups = response[0].groupedAttributes;
          const formattedWithGroup = groups.flatMap((group: any) =>
            group.attributes.map((attr: any) => ({
              id: attr.id,
              name: attr.name,
              groupName: group.groupName,
              values: attr.values,
              isVariant: attr.isVariant,
            }))
          );
          setAttributes(formattedWithGroup);
        }
      }
    } catch (error) {
      console.error("Error updating attribute value:", error);
    }
  };

  const handleAddValue = async (attributeId: string) => {
    if (!newValue?.value.trim()) return;

    try {
      await manageAttribute("update", attributeId, "addValue", {
        value: newValue.value,
      });
      setNewValue(null);
    } catch (error) {
      console.error("Error adding new value:", error);
    }
  };

  const handleEditClick = (attr: AttributeType) => {
    if (attr.id) {
      setEditingAttribute({
        id: attr.id,
        name: attr.name,
        group: attr.groupName || "",
        isVariant: attr.isVariant || false,
      });
    }
  };

  console.log(
    "formData:",
    formData,
    "Attributes:",
    attributes,
    "Groups:",
    groups
  );

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
        <div className="w-full">
          <select
            title="Parent Category"
            name="catId"
            onChange={(e) => setCatId(e.target.value)}
            value={catId}
            className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
          >
            <option value="" className="text-gray-700">
              Select category
            </option>
            {category.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.categoryName}
              </option>
            ))}
          </select>
        </div>

        {/* Group Selection */}
        <div className="w-full space-y-4">
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
            <label htmlFor="group" className="whitespace-nowrap">
              Group:
            </label>
            <select
              id="group"
              title="group"
              name="groupName"
              onChange={(e) => {
                setIsNewGroup(e.target.value);
              }}
              className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            >
              <option value="">Select or Create New Group</option>
              {groups?.length > 0 &&
                groups.map((group) => (
                  <option key={group._id} value={group.name}>
                    {group.name}
                  </option>
                ))}
              <option value="create">Create New Group</option>
            </select>
          </div>

          {isNewGroup === "create" && (
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
                  Values:
                </label>
                <input
                  id={`values-${index}`}
                  type="text"
                  name={`values-${index}`}
                  value={attr.values.join(", ")}
                  placeholder="Values separated by commas"
                  onChange={(e) =>
                    handleInputChange(index, "values", e.target.value)
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
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
              key={`${attr.id}-${attr.groupName || "nogroup"}`}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <span>{attr.name} </span>
                  <span className="text-sm text-gray-300">
                    {attr.groupName}{" "}
                  </span>
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
                  {editingAttribute && (
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
                        className="p-1 rounded bg-white dark:bg.gray-700"
                        title="Edit attribute name"
                        placeholder="Enter attribute name"
                        aria-label="Edit attribute name"
                      />
                      <select
                        value={editingAttribute.group}
                        onChange={(e) =>
                          setEditingAttribute({
                            ...editingAttribute,
                            group: e.target.value,
                          })
                        }
                        className="p-1 rounded bg-white dark:bg.gray-700"
                        title="Select attribute group"
                        aria-label="Select attribute group"
                      >
                        {groups.map((group) => (
                          <option key={group._id} value={group.name}>
                            {group.name}
                          </option>
                        ))}
                      </select>
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
                            editingAttribute.group,
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
              <div className="flex flex-wrap gap-2 mt-2">
                {newValue?.attributeId === attr.id ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto text-xs bg-gray-700 text-white p-2 rounded-lg">
                    <input
                      type="text"
                      value={newValue?.value || ""}
                      onChange={(e) => {
                        if (newValue) {
                          setNewValue({
                            attributeId: newValue.attributeId,
                            value: e.target.value,
                          });
                        }
                      }}
                      className="p-1 rounded bg-white dark:bg.gray-700 text-black"
                      placeholder="Enter new value"
                      aria-label="New attribute value"
                    />
                    <button
                      onClick={() => handleAddValue(attr.id!)}
                      className="text-green-300 hover:text-green-100 px-2 py-1 rounded"
                      aria-label="Save new value"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setNewValue(null)}
                      className="text-gray-300 hover:text-gray-100 px-2 py-1 rounded"
                      aria-label="Cancel adding value"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setNewValue({ attributeId: attr.id!, value: "" })
                    }
                    className="flex items-center gap-1 text-xs bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                    aria-label={`Add new value to ${attr.name}`}
                  >
                    + Add Value
                  </button>
                )}
                {attr.values.map((val) => (
                  <span
                    key={val._id}
                    className="flex items-center gap-2 text-xs bg-gray-600 text-white p-2 rounded-lg"
                  >
                    {editingValue?.id === val._id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingValue.value}
                          onChange={(e) =>
                            setEditingValue({
                              ...editingValue,
                              value: e.target.value,
                            })
                          }
                          className="p-1 rounded bg-white dark:bg-gray-700 text-black"
                          title="Edit attribute value"
                          placeholder="Enter new value"
                          aria-label="Edit attribute value"
                        />
                        <button
                          onClick={() =>
                            handleUpdateAttributeValue(
                              val._id,
                              editingValue.value
                            )
                          }
                          className="text-green-300 hover:text-green-100 px-2 py-1 rounded"
                          aria-label="Save value changes"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingValue(null)}
                          className="text-gray-300 hover:text-gray-100 px-2 py-1 rounded"
                          aria-label="Cancel value editing"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {val.value}
                        <button
                          onClick={() =>
                            setEditingValue({
                              id: val._id,
                              value: val.value,
                            })
                          }
                          className="text-blue-300 hover:text-blue-100"
                          aria-label={`Edit value ${val.value}`}
                        >
                          Edit
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        manageAttribute("delete", val._id, "value")
                      }
                      className="text-red-300 hover:text-red-100"
                      aria-label={`Delete value ${val.value}`}
                    >
                      <Delete fontSize="small" />
                    </button>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Attributes;
