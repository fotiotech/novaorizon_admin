"use client";

import {
  createAttributeGroup,
  findAllAttributeGroups,
  findGroup,
  updateAttributeGroup,
} from "@/app/actions/attributegroup";
import {
  createAttribute,
  deleteAttribute,
  findAttributesAndValues,
  updateAttribute,
} from "@/app/actions/attributes";
import GroupSelector from "@/components/category/groupSelection";
import { Delete, Edit } from "@mui/icons-material";
import Link from "next/link";
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
  sort_order: number;
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
  sort_order: number;
};

interface Option {
  value: string;
  label: string;
}

const Attributes = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [formData, setFormData] = useState<AttributeType[]>([
    { code: "", name: "", type: "", option: "", sort_order: 0 },
  ]);

  const [editingAttribute, setEditingAttribute] =
    useState<EditingAttributeType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [sortAttrOrder, setSortAttrOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });

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

    fetchData();
  }, []);

  function addAttributes() {
    setFormData((prev) => [
      ...prev,
      { code: "", name: "", option: "", type: "", sort_order: 0 },
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
              sort_order:
                field === "sort_order" ? Number(value) : attr.sort_order,
            }
          : attr
      )
    );
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
          codes: formData.map((attr) => attr.code.trim()),
          names: formData.map((attr) => attr.name.trim()),
          sort_orders: formData.map((attr) => attr.sort_order),
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
              sort_order: 0,
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
            sort_order: updateData.sort_order,
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
    type: string,
    sort_order: number
  ) => {
    try {
      await manageAttribute("update", id, "attribute", {
        code,
        name,
        option,
        type,
        sort_order,
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
      sort_order: attr.sort_order || 0,
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

  return (
    <div className="max-w-7xl mx-auto lg:px-8 w-full text-text">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-xl my-2">Attributes</h2>
        <Link href={"/attributes/group"} className="p-2 font-semibold">
          + Group
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

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
                <label htmlFor={`sort_order-${index}`} className="block mb-1">
                  Sort Order:
                </label>
                <input
                  id={`sort_order-${index}`}
                  type="text"
                  name={`sort_order-${index}`}
                  value={attr.sort_order}
                  onChange={(e) =>
                    handleInputChange(index, "sort_order", e.target.value)
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
                  <option value="any">any</option>
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
              className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-text">{attr.name} </span>
                  <span
                    onClick={() => handleEditClick(attr)}
                    className="cursor-pointer"
                  >
                    <Edit fontSize="small" />
                  </span>
                </div>
                <button
                  onClick={() =>
                    manageAttribute("delete", attr.code, "attribute")
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
                        type="number"
                        name={editingAttribute.sort_order.toString()}
                        value={editingAttribute.sort_order}
                        onChange={(e) =>
                          setEditingAttribute({
                            ...editingAttribute,
                            sort_order: Number(e.target.value),
                          })
                        }
                        className="p-1 rounded bg-none border dark:bg-gray-400"
                        title="Edit attribute sort_order"
                        placeholder="Enter attribute sort_order"
                        aria-label="Edit attribute sort_order"
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
                            editingAttribute.type,
                            editingAttribute.sort_order
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
