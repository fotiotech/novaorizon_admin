"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ux/Modal";
import {
  createAttribute,
  updateAttribute,
  findAttributesAndValues,
} from "@/app/actions/attributes";
import { getUnitFamilies } from "@/app/actions/unitFamilyActions";
import { Save, Cancel, Add, Delete as DeleteIcon } from "@mui/icons-material";

export type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  unitFamily: string;
  name: string;
  option?: string | string[];
  isRequired?: boolean;
  type: string;
  sort_order: number;
};

interface AttributeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attributeId?: string;
}

interface UnitFamily {
  _id: string;
  name: string;
  description?: string;
  baseUnit: string;
}

export const AttributeFormModal: React.FC<AttributeFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attributeId,
}) => {
  const isEditing = !!attributeId;
  const [formData, setFormData] = useState<any[]>([
    {
      code: "",
      unitFamily: "",
      name: "",
      type: "text",
      option: "",
      isRequired: false,
      sort_order: 0,
    },
  ]);
  const [unitFamilies, setUnitFamilies] = useState<UnitFamily[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch unit families
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

  // Fetch attribute data if editing
  useEffect(() => {
    const fetchAttributeData = async () => {
      if (isEditing && attributeId) {
        try {
          setIsLoading(true);
          const attributes = await findAttributesAndValues();
          const attribute: any = (
            attributes as unknown as AttributeType[]
          ).find((attr) => attr._id === attributeId || attr.id === attributeId);

          if (attribute) {
            const optionString = Array.isArray(attribute.option)
              ? attribute.option.join(",")
              : attribute.option || "";
            setFormData([
              {
                code: attribute.code || "",
                unitFamily: attribute.unitFamily?._id || "",
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
      } else {
        // Reset for create mode
        setFormData([
          {
            code: "",
            unitFamily: "",
            name: "",
            type: "text",
            option: "",
            isRequired: false,
            sort_order: 0,
          },
        ]);
      }
    };

    if (isOpen) {
      fetchAttributeData();
    }
  }, [attributeId, isEditing, isOpen]);

  const handleInputChange = (
    index: number,
    field: string,
    value: string | number | boolean,
  ) => {
    setFormData((prev) =>
      prev.map((attr, i) =>
        i === index
          ? {
              ...attr,
              [field]: value,
            }
          : attr,
      ),
    );
  };

  const addAttributeField = () => {
    if (isEditing) return;

    setFormData((prev) => [
      ...prev,
      {
        code: "",
        unitFamily: "",
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
        (attr) => !attr.name.trim() || !attr.type.trim() || !attr.code.trim(),
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
          unitFamily: formData[0].unitFamily.trim(),
          sort_order: formData[0].sort_order,
          option:
            formData[0].option
              ?.split(",")
              .map((opt: string) => opt.trim())
              .filter((opt: string) => opt) || [],
          isRequired: formData[0].isRequired,
          type: formData[0].type.trim(),
        };

        await updateAttribute(attributeId, attributeData);
      } else {
        const attributeData = {
          codes: formData.map((attr) => attr.code.trim()),
          unitFamilies: formData.map((attr) => attr.unitFamily.trim()),
          names: formData.map((attr) => attr.name.trim()),
          isRequired: formData.map((attr) => attr.isRequired),
          sort_orders: formData.map((attr) => attr.sort_order),
          option: formData.map(
            (attr) =>
              attr.option
                ?.split(",")
                .map((opt: string) => opt.trim())
                .filter((opt: string) => opt) || [],
          ),
          type: formData.map((attr) => (attr.type.trim() ? attr.type : "text")),
        };

        await createAttribute(attributeData);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving attribute:", err);
      setError(err instanceof Error ? err.message : "Failed to save attribute");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Attribute" : "Create Attribute"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <div className="max-h-96 overflow-y-auto space-y-6 pr-2">
          {formData.map((attr, index) => (
            <div
              key={index}
              className="p-4 border border-border rounded-lg bg-card"
            >
              {!isEditing && formData.length > 1 && (
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Attribute {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttributeField(index)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Code */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Code *</label>
                <input
                  type="text"
                  value={attr.code}
                  onChange={(e) =>
                    handleInputChange(index, "code", e.target.value)
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                  placeholder="e.g., product-size"
                  disabled={isLoading}
                />
              </div>

              {/* Name */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={attr.name}
                  onChange={(e) =>
                    handleInputChange(index, "name", e.target.value)
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                  placeholder="e.g., Product Size"
                  disabled={isLoading}
                />
              </div>

              {/* Type */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={attr.type}
                  onChange={(e) =>
                    handleInputChange(index, "type", e.target.value)
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                  disabled={isLoading}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multiselect">Multi-Select</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                </select>
              </div>

              {/* Unit Family */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Unit Family
                </label>
                <select
                  value={attr.unitFamily}
                  onChange={(e) =>
                    handleInputChange(index, "unitFamily", e.target.value)
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                  disabled={isLoading || isLoadingFamilies}
                >
                  <option value="">Select a unit family</option>
                  {unitFamilies.map((family) => (
                    <option key={family._id} value={family._id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Options */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Options (comma-separated)
                </label>
                <input
                  type="text"
                  value={attr.option}
                  onChange={(e) =>
                    handleInputChange(index, "option", e.target.value)
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                  placeholder="e.g., Small, Medium, Large"
                  disabled={isLoading}
                />
              </div>

              {/* Sort Order */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={attr.sort_order}
                  onChange={(e) =>
                    handleInputChange(
                      index,
                      "sort_order",
                      parseInt(e.target.value),
                    )
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>

              {/* Is Required */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attr.isRequired}
                    onChange={(e) =>
                      handleInputChange(index, "isRequired", e.target.checked)
                    }
                    disabled={isLoading}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">Is Required</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Add Attribute Button (create mode only) */}
        {!isEditing && (
          <button
            type="button"
            onClick={addAttributeField}
            disabled={isLoading}
            className="w-full inline-flex justify-center items-center gap-1 px-4 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition disabled:opacity-50"
          >
            <Add className="w-4 h-4" />
            Add Attribute
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition disabled:opacity-50"
          >
            <Cancel className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
