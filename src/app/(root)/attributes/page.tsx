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
import GroupSelector from "@/components/category/groupSelection";
import { Delete, Edit } from "@mui/icons-material";
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";

// Update the AttributeType interface to include isVariant
type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  option?: string;
  type: string;
};

// Update the AttributesGroup type
type AttributesGroup = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  attributes?: string[]; // Array of attribute IDs
  group_order: number;
  sort_order: number;
};

type EditingAttributeType = {
  id: string;
  code: string;
  name: string;
  option?: string;
  type: string;
};

interface Option {
  value: string;
  label: string;
}

const Attributes = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [formData, setFormData] = useState<AttributeType[]>([
    { code: "", name: "", type: "", option: "" },
  ]);
  const [groups, setGroups] = useState<AttributesGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [groupOrder, setGroupOrder] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [groupId, setGroupId] = useState<string>("");
  const [parentGroupId, setParentGroupId] = useState<string>("");
  const [editingAttribute, setEditingAttribute] =
    useState<EditingAttributeType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [sortAttrOrder, setSortAttrOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

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
        const groupResponse = await findAllAttributeGroups(groupId);
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
    setFormData((prev) => [
      ...prev,
      { code: "", name: "", option: "", type: "" },
    ]);
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
              code: field === "code" ? (value as string) : attr.code,
              name: field === "name" ? (value as string) : attr.name,
              option: field === "option" ? (value as string) : attr.option,
              type: field === "type" ? (value as string) : attr.type,
            }
          : attr
      )
    );
  };

  const handleCreateGroup = async () => {
    // if (newGroupName.trim() === "") return;

    const response = await createAttributeGroup(
      groupId || "",
      newGroupName,
      code,
      parentGroupId,
      selectedAttributes,
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
          action: groupId,
          codes: formData.map((attr) => attr.code.trim()),
          names: formData.map((attr) => attr.name.trim()),
          option: formData.map((attr) =>
            attr.option?.split(",")
          ) as unknown as string[][],
          type: formData.map((attr) => (attr.type.trim() ? attr.type : "text")),
        };

        try {
          await createAttribute(attributeData);
          console.log("[Attributes] Successfully created attributes");
          // Reset form after successful creation
          setFormData([
            {
              code: "",
              name: "",
              option: "",
              type: "",
            },
          ]);
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
          if (!updateData.code.trim() || !updateData.name.trim()) {
            setError("Attribute name cannot be empty");
            return;
          }

          await updateAttribute(id, {
            code: updateData.code.trim(),
            name: updateData.name.trim(),
            option: updateData.option.split(","),
            type: updateData.type.trim(),
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
    code: string,
    name: string,
    option: string,
    type: string
  ) => {
    try {
      await manageAttribute("update", id, "attribute", {
        code,
        name,
        option,
        type,
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
    if (!attr._id) return;

    // coerce select‐options array into a comma‐string
    const optionString = Array.isArray(attr.option)
      ? attr.option.join(",")
      : attr.option || "";

    setEditingAttribute({
      id: attr._id,
      code: attr.code,
      name: attr.name,
      option: optionString,
      type: attr.type || "",
    });
  };

  const sortOptions: Option[] = [
    { value: "asc", label: "A → Z" },
    { value: "desc", label: "Z → A" },
  ];

  const visibleAttributes = useMemo(() => {
    const filtered = attributes.filter((a) =>
      a.name.toLowerCase().includes(filterText.toLowerCase())
    );
    const sorted = filtered.sort((a, b) =>
      sortAttrOrder.value === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    return sorted;
  }, [attributes, filterText, sortAttrOrder]);

  console.log("editingAttributes:", editingAttribute);

  return (
    <div className="max-w-7xl mx-auto lg:px-8 w-full">
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
          <div className="flex flex-col gap-2 ">
            <p className="">Group:</p>

            <GroupSelector
              groups={groups}
              groupId={groupId}
              setGroupId={setGroupId}
            />
          </div>

          {groupId === "create" && (
            <div className="space-y-4 pl-0 md:pl-4">
              <select
                title="group"
                name="parentGroupId"
                value={parentGroupId}
                onChange={(e) => {
                  setParentGroupId(e.target.value);
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
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter new group code e.g. name_top10"
                  className="w-full md:w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
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

      {/* Attributes for group selection */}

      <div>
        <h3>Select Attributes for group</h3>
        <div className="h-64 overflow-y-auto">
          <div className="my-3 flex md:flex-row gap-2 items-center">
            <input
              type="text"
              placeholder="Filter attributes..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full md:w-1/2 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            />
            <Select
              options={sortOptions}
              value={sortAttrOrder}
              onChange={(opt) => setSortAttrOrder(opt as Option)}
              className="w-1/3 md:w-1/4 dark:bg-sec-dark"
            />
          </div>
          {visibleAttributes.map((attr) => (
            <div key={attr._id} className="flex items-center gap-2 ">
              <input
                type="checkbox"
                id={`attr-${attr._id}`}
                checked={selectedAttributes.includes(attr._id || "")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAttributes((prev) => [...prev, attr._id || ""]);
                  } else {
                    setSelectedAttributes((prev) =>
                      prev.filter((id) => id !== attr._id)
                    );
                  }
                }}
                className={
                  selectedAttributes.includes(attr._id || "")
                    ? "checked:bg-blue-500"
                    : ""
                }
              />
              <label htmlFor={`attr-${attr._id}`}>{attr.name}</label>
            </div>
          ))}
        </div>
        <div className="flex justify-end my-4 mb-8">
          <button
            type="button"
            onClick={handleCreateGroup}
            className="btn text-sm mt-2 "
          >
            Assign Attributes{" "}
          </button>
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
                <label htmlFor={`code-${index}`} className="block mb-1">
                  Code:
                </label>
                <input
                  id={`code-${index}`}
                  type="text"
                  name={`code-${index}`}
                  value={attr.code}
                  onChange={(e) =>
                    handleInputChange(index, "code", e.target.value)
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
              </div>
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
                  <option value="">select type</option>
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
              {attr.type === "select" && (
                <div>
                  <label htmlFor={`option-${index}`} className="block mb-1">
                    Options:
                  </label>
                  <input
                    id={`option-${index}`}
                    type="text"
                    name={`option-${index}`}
                    value={attr.option}
                    placeholder="Options for select type separated by commas"
                    onChange={(e) =>
                      handleInputChange(index, "option", e.target.value)
                    }
                    className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                  />
                </div>
              )}
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
        <div className="my-3 flex md:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Filter attributes..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full md:w-1/2 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
          />
          <Select
            options={sortOptions}
            value={sortAttrOrder}
            onChange={(opt) => setSortAttrOrder(opt as Option)}
            className="w-1/3 md:w-1/4 dark:bg-sec-dark"
          />
        </div>
        <ul className="grid gap-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
          {visibleAttributes.map((attr) => (
            <li
              key={`${attr.name}-${attr._id || "nogroup"}`}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-300">{attr.name} </span>
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
                        name={editingAttribute.code}
                        value={editingAttribute.code}
                        onChange={(e) =>
                          setEditingAttribute({
                            ...editingAttribute,
                            code: e.target.value,
                          })
                        }
                        className="p-1 rounded bg-none border dark:bg-gray-400"
                        title="Edit attribute code"
                        placeholder="Enter attribute code"
                        aria-label="Edit attribute code"
                      />
                      <input
                        type="text"
                        name={editingAttribute.name}
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
                        value={editingAttribute.type || ""}
                        onChange={(e) =>
                          setEditingAttribute({
                            ...editingAttribute,
                            type: e.target.value,
                          })
                        }
                        className="p-1 rounded bg-gray-400 dark:bg-gray-700 w-44"
                        aria-label="Selected attribute type"
                      >
                        <option value="" disabled>
                          select type
                        </option>
                        <option value="text">text</option>
                        <option value="select">select</option>
                        <option value="checkbox">checkbox</option>
                        <option value="radio">radio</option>
                        <option value="boolean">boolean</option>
                        <option value="textarea">textarea</option>
                        <option value="number">number</option>
                        <option value="date">date</option>
                        <option value="color">color</option>
                        <option value="file">file</option>
                        <option value="url">url</option>
                        <option value="multi-select">multi-select</option>
                      </select>

                      {editingAttribute.type === "select" && (
                        <input
                          type="text"
                          value={editingAttribute.option}
                          onChange={(e) =>
                            setEditingAttribute({
                              ...editingAttribute,
                              option: e.target.value,
                            })
                          }
                          className="p-1 rounded bg-none border dark:bg-gray-400"
                          title="Edit option"
                          placeholder="Enter options for select type separated by commas"
                          aria-label="Edit attribute option"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateAttribute(
                            editingAttribute.id,
                            editingAttribute.code,
                            editingAttribute.name,
                            editingAttribute.option as string,
                            editingAttribute.type
                          )
                        }
                        className="btn-sm bg-green-500 hover:bg-green-600 text-white rounded px-2"
                        aria-label="Save attribute changes"
                      >
                        Save
                      </button>
                      <button
                        type="button"
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
