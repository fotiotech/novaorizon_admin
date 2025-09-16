"use client";

import React, { useState, useEffect } from "react";
import {
  createAttribute,
  updateAttribute,
  findAttributesAndValues,
} from "@/app/actions/attributes";
import { getUnitFamilies } from "@/app/actions/unitFamilyActions"; // Import unit family actions
import { Delete, Edit, Save, Cancel, Add } from "@mui/icons-material";

export type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  unitFamily: string; // Changed from unit to unitFamily
  name: string;
  option?: string | string[];
  isRequired?: boolean;
  type: string;
  sort_order: number;
};

interface AttributeFormProps {
  attributeId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  mode?: "create" | "edit";
}

type AttributeFormData = {
  code: string;
  unitFamily: string; // Changed from unit to unitFamily
  name: string;
  type: string;
  option: string;
  isRequired: boolean;
  sort_order: number;
};

interface UnitFamily {
  _id: string;
  name: string;
  description?: string;
  baseUnit: string;
}

const AttributeForm: React.FC<AttributeFormProps> = ({
  attributeId,
  onSuccess,
  onCancel,
  mode = "create",
}) => {
  const [formData, setFormData] = useState<AttributeFormData[]>([
    {
      code: "",
      unitFamily: "", // Changed from unit to unitFamily
      name: "",
      type: "text",
      option: "",
      isRequired: false,
      sort_order: 0,
    },
  ]);
  const [unitFamilies, setUnitFamilies] = useState<UnitFamily[]>([]); // State for unit families
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(true); // Loading state for unit families
  const [error, setError] = useState<string | null>(null);
  const isEditing = mode === "edit";

  // Fetch unit families from your Unit Management system
  useEffect(() => {
    const fetchUnitFamilies = async () => {
      try {
        setIsLoadingFamilies(true);
        const familiesData = await getUnitFamilies();
        setUnitFamilies(familiesData);
      } catch (err) {
        console.error("Error fetching unit families:", err);
        setError("Failed to load unit families");
      } finally {
        setIsLoadingFamilies(false);
      }
    };

    fetchUnitFamilies();
  }, []);

  // Fetch attribute data if in edit mode
  useEffect(() => {
    const fetchAttributeData = async () => {
      if (isEditing && attributeId) {
        try {
          setIsLoading(true);
          const attributes = await findAttributesAndValues();
          const attribute = (attributes as unknown as AttributeType[]).find(
            (attr) => attr._id === attributeId || attr.id === attributeId
          );

          if (attribute) {
            const optionString = Array.isArray(attribute.option)
              ? attribute.option.join(",")
              : attribute.option || "";

            setFormData([
              {
                code: attribute.code || "",
                unitFamily: attribute.unitFamily || "", // Changed from unit to unitFamily
                name: attribute.name || "",
                type: attribute.type || "text",
                option: optionString,
                isRequired: attribute.isRequired || false,
                sort_order: attribute.sort_order || 0,
              },
            ]);
          } else {
            setError("Attribute not found");
          }
        } catch (err) {
          console.error("Error fetching attribute:", err);
          setError("Failed to load attribute data");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchAttributeData();
  }, [attributeId, isEditing]);

  const handleInputChange = (
    index: number,
    field: keyof AttributeFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) =>
      prev.map((attr, i) =>
        i === index
          ? {
              ...attr,
              [field]: value,
            }
          : attr
      )
    );
  };

  const addAttributeField = () => {
    if (isEditing) return;

    setFormData((prev) => [
      ...prev,
      {
        code: "",
        unitFamily: "", // Changed from unit to unitFamily
        name: "",
        type: "text",
        option: "",
        isRequired: false,
        sort_order: 0,
      },
    ]);
  };

  const removeAttributeField = (index: number) => {
    if (isEditing) return;

    if (formData.length > 1) {
      setFormData((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const invalidAttributes = formData.filter(
        (attr) => !attr.name.trim() || !attr.type.trim() || !attr.code.trim()
      );

      if (invalidAttributes.length > 0) {
        setError("Name, code, and type are required for all attributes");
        setIsLoading(false);
        return;
      }

      if (isEditing && attributeId) {
        const attributeData = {
          code: formData[0].code.trim(),
          name: formData[0].name.trim(),
          unitFamily: formData[0].unitFamily.trim(), // Changed from unit to unitFamily
          sort_order: formData[0].sort_order,
          option:
            formData[0].option
              ?.split(",")
              .map((opt) => opt.trim())
              .filter((opt) => opt) || [],
          isRequired: formData[0].isRequired,
          type: formData[0].type.trim(),
        };

        await updateAttribute(attributeId, attributeData);
      } else {
        const attributeData = {
          codes: formData.map((attr) => attr.code.trim()),
          unitFamilies: formData.map((attr) => attr.unitFamily.trim()), // Changed from units to unitFamilies
          names: formData.map((attr) => attr.name.trim()),
          isRequired: formData.map((attr) => attr.isRequired),
          sort_orders: formData.map((attr) => attr.sort_order),
          option: formData.map(
            (attr) =>
              attr.option
                ?.split(",")
                .map((opt) => opt.trim())
                .filter((opt) => opt) || []
          ),
          type: formData.map((attr) => (attr.type.trim() ? attr.type : "text")),
        };

        await createAttribute(attributeData);
      }

      onSuccess();
    } catch (err) {
      console.error("Error saving attribute:", err);
      setError(err instanceof Error ? err.message : "Failed to save attribute");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      setFormData([
        {
          code: "",
          unitFamily: "", // Changed from unit to unitFamily
          name: "",
          type: "text",
          option: "",
          isRequired: false,
          sort_order: 0,
        },
      ]);
      setError(null);
    }
  };

  if (isLoading && mode === "edit") {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {isEditing ? "Edit Attribute" : "Create Attributes"}
        </h3>
        {!isEditing && (
          <button
            onClick={addAttributeField}
            type="button"
            className="btn text-sm flex items-center gap-1"
          >
            <Add fontSize="small" /> Add Field
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {formData.map((attr, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg relative"
            >
              {!isEditing && formData.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAttributeField(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  aria-label="Remove attribute field"
                >
                  <Delete fontSize="small" />
                </button>
              )}

              <div>
                <label htmlFor={`code-${index}`} className="block mb-1 text-sm">
                  Code:
                </label>
                <input
                  id={`code-${index}`}
                  type="text"
                  value={attr.code}
                  onChange={(e) =>
                    handleInputChange(index, "code", e.target.value)
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`unitFamily-${index}`}
                  className="block mb-1 text-sm"
                >
                  Unit Family:
                </label>
                {isLoadingFamilies ? (
                  <div className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark">
                    Loading unit families...
                  </div>
                ) : (
                  <select
                    id={`unitFamily-${index}`}
                    value={attr.unitFamily}
                    onChange={(e) =>
                      handleInputChange(index, "unitFamily", e.target.value)
                    }
                    className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                  >
                    <option value="">Select a unit family</option>
                    {unitFamilies.map((family) => (
                      <option key={family._id} value={family._id}>
                        {family.name} (Base: {family.baseUnit})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label
                  htmlFor={`sort_order-${index}`}
                  className="block mb-1 text-sm"
                >
                  Sort Order:
                </label>
                <input
                  id={`sort_order-${index}`}
                  type="number"
                  value={attr.sort_order}
                  onChange={(e) =>
                    handleInputChange(
                      index,
                      "sort_order",
                      Number(e.target.value)
                    )
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor={`name-${index}`} className="block mb-1 text-sm">
                  Name:
                </label>
                <input
                  id={`name-${index}`}
                  type="text"
                  value={attr.name}
                  onChange={(e) =>
                    handleInputChange(index, "name", e.target.value)
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                  required
                />
              </div>

              <div className="flex items-center">
                <label
                  htmlFor={`isRequired-${index}`}
                  className="block mb-1 text-sm mr-2"
                >
                  Is required:
                </label>
                <input
                  id={`isRequired-${index}`}
                  type="checkbox"
                  checked={attr.isRequired}
                  onChange={(e) =>
                    handleInputChange(index, "isRequired", e.target.checked)
                  }
                  className="w-4 h-4 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
              </div>

              <div>
                <label htmlFor={`type-${index}`} className="block mb-1 text-sm">
                  Type:
                </label>
                <select
                  id={`type-${index}`}
                  value={attr.type}
                  onChange={(e) =>
                    handleInputChange(index, "type", e.target.value)
                  }
                  className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                  required
                >
                  <option value="text">Text</option>
                  <option value="select">Select</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="boolean">Boolean</option>
                  <option value="radio">Radio</option>
                  <option value="textarea">Textarea</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="color">Color</option>
                  <option value="file">File</option>
                  <option value="url">URL</option>
                  <option value="multi-select">Multi-Select</option>
                </select>
              </div>

              {(attr.type === "select" || attr.type === "multi-select") && (
                <div className="md:col-span-2">
                  <label
                    htmlFor={`option-${index}`}
                    className="block mb-1 text-sm"
                  >
                    Options:
                  </label>
                  <input
                    id={`option-${index}`}
                    type="text"
                    value={attr.option}
                    onChange={(e) =>
                      handleInputChange(index, "option", e.target.value)
                    }
                    className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                    placeholder="Comma-separated options (e.g., Small,Medium,Large)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate options with commas
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition"
            disabled={isLoading}
          >
            <Cancel fontSize="small" className="mr-1" /> Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition flex items-center disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save fontSize="small" className="mr-1" />
                {isEditing ? "Update Attribute" : "Save All Attributes"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AttributeForm;
