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

  useEffect(() => {
    const fetchData = async () => {
      const res = await getCategory();
      setCategory(res || []);

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
    };

    async function getGroups() {
      if (!catId) return;
      const groupResponse = await findAllAttributeGroups(catId);
      console.log("groupResponse:", groupResponse);
      setGroups(groupResponse as unknown as AttributesGroup[]);
    };

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
        console.error("Category ID is required");
        return;
      }

      if (action === "create") {
        if (formData.some((attr) => !attr.name || !attr.values)) {
          console.error("Name and values are required for all attributes");
          return;
        }

        await createAttribute({
          catId,
          groupName: isNewGroup === "create" ? newGroupName : isNewGroup,
          names: formData.map((attr) => attr.name),
          values: formData.map((attr) => attr.values.map(v => v.value)),
          isVariants: formData.map((attr) => attr.isVariant || false),
        });

        // Reset form after successful creation
        setFormData([{ name: "", values: [] }]);
      } else if (action === "delete") {
        if (attrOrVal === "attribute" && id) {
          await deleteAttribute(id);
        } else if (attrOrVal === "value" && id) {
          await deleteAttributeValue(id);
        }
      } else if (action === "update") {
        if (attrOrVal === "attribute" && id && updateData) {
          await updateAttribute(id, {
            name: updateData.name,
            group: updateData.group,
            category_id: updateData.category_id,
            isVariant: updateData.isVariant,
          });
        } else if (attrOrVal === "value" && id && updateData) {
          await updateAttributeValue(id, {
            value: updateData.value,
          });
        } else if (attrOrVal === "addValue" && id && updateData) {
          await updateAttributeValue(id, {
            action: "addValue",
            value: updateData.value,
          });
        }
      }

      // Refresh the attributes list after any operation
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
      console.error("Error managing attribute:", error);
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
    <>
      <h2 className="font-bold text-xl my-2">Attributes</h2>
      {/* <form action={createAttribute}> */}
      <select
        title="Parent Category"
        name="catId"
        onChange={(e) => setCatId(e.target.value)}
        value={catId}
        className="w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
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

      <div>
        <label htmlFor={`group`}>Group:</label>
        <select
          title="group"
          name="groupName"
          onChange={(e) => {
            setIsNewGroup(e.target.value);
          }}
          className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
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
        {isNewGroup === "create" && (
          <div>
            <div>
              <select
                title="group"
                name="groupId"
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value);
                }}
                className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
              >
                <option value="">Select parent group</option>
                {groups?.length > 0 &&
                  groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                name="newGroupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter new group name"
                className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
              />
              <button
                type="button"
                onClick={handleCreateGroup}
                className="btn text-sm"
              >
                Create Group
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-lg mt-6">Create Attributes:</p>
        <div className="flex justify-end items-center gap-2">
          <button onClick={addAttributes} type="button" className="btn text-sm">
            Add new property
          </button>
        </div>

        {formData.map((attr, index) => (
          <div key={index} className="flex gap-2 my-2">
            <div>
              <label htmlFor={`name-${index}`}>Name:</label>
              <input
                id={`name-${index}`}
                type="text"
                name={`name-${index}`}
                value={attr.name}
                onChange={(e) =>
                  handleInputChange(index, "name", e.target.value)
                }
                className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
              />
            </div>
            <div>
              <label htmlFor={`values-${index}`}>Values:</label>
              <input
                id={`values-${index}`}
                type="text"
                name={`values-${index}`}
                value={attr.values.join(", ")}
                placeholder="Values separated by commas"
                onChange={(e) =>
                  handleInputChange(index, "values", e.target.value)
                }
                className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
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

      <div className="flex justify-end items-center gap-2">
        <button
          type="button"
          onClick={() => manageAttribute("create")}
          className="btn my-2"
        >
          Save All & Submit
        </button>
      </div>
      {/* </form> */}

      <div>
        <h3 className="font-bold text-lg">Attributes List</h3>
        <ul className="flex flex-col gap-1 max-h-screen overflow-hidden overflow-y-auto scrollbar-none">
          {attributes.map((attr) => (
            <li
              key={attr.id || attr.name}
              className="flex flex-col gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2"
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
                        className="p-1 rounded bg-white dark:bg-gray-700"
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
                        className="p-1 rounded bg-white dark:bg-gray-700"
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
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newValue?.attributeId === attr.id ? (
                  <div className="flex items-center gap-2 text-xs bg-gray-700 text-white p-2 rounded-lg">
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
                      className="p-1 rounded bg-white dark:bg-gray-700 text-black"
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
    </>
  );
};

export default Attributes;
