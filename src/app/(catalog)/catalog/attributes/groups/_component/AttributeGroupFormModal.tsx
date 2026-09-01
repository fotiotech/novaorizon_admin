"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ux/Modal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import Select from "react-select";
import {
  createAttributeGroup,
  findGroup,
  updateAttributeGroup,
} from "@/app/actions/attributegroup";
import { Delete, Save, Cancel } from "@mui/icons-material";

interface AttributeGroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId?: string; // if provided, editing mode
  attributes: any[];
  groups: any[];
}

interface Option {
  value: string;
  label: string;
}

const selectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "hsl(var(--background))",
    borderColor: "hsl(var(--border))",
    color: "hsl(var(--foreground))",
    borderRadius: "0.5rem",
    boxShadow: "none",
    "&:hover": { borderColor: "hsl(var(--primary))" },
    minHeight: "42px",
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "hsl(var(--muted))" : "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    "&:active": {
      backgroundColor: "hsl(var(--primary) / 0.2)",
    },
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "hsl(var(--foreground))",
  }),
  input: (base: any) => ({
    ...base,
    color: "hsl(var(--foreground))",
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "hsl(var(--primary) / 0.2)",
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: "hsl(var(--foreground))",
  }),
};

export const AttributeGroupFormModal: React.FC<
  AttributeGroupFormModalProps
> = ({ isOpen, onClose, onSuccess, groupId, attributes, groups }) => {
  const isEditing = !!groupId;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState<number | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [parentGroupId, setParentGroupId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch group data when editing
  useEffect(() => {
    if (isEditing && groupId) {
      const fetchGroupData = async () => {
        setIsLoading(true);
        try {
          const groupData = await findGroup(groupId);
          if (groupData) {
            setName(groupData.name || "");
            setCode(groupData.code || "");
            setParentGroupId(groupData.parentId || "");
            setSortOrder(groupData.sortOrder || null);
            const attrIds =
              groupData.attributes?.map((attr: any) => attr._id || attr.id) ||
              [];
            setSelectedAttributes(attrIds);
          }
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load group");
        } finally {
          setIsLoading(false);
        }
      };
      fetchGroupData();
    } else {
      // Reset form for create mode
      setName("");
      setCode("");
      setSortOrder(null);
      setParentGroupId("");
      setSelectedAttributes([]);
      setError(null);
    }
  }, [isEditing, groupId, isOpen]);

  const handleAttributeToggle = (attributeId: string) => {
    setSelectedAttributes((prev) =>
      prev.includes(attributeId)
        ? prev.filter((id) => id !== attributeId)
        : [...prev, attributeId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!name.trim()) {
        setError("Group name is required");
        setIsLoading(false);
        return;
      }

      if (!code.trim()) {
        setError("Group code is required");
        setIsLoading(false);
        return;
      }

      if (isEditing && groupId) {
        const data = {
          name,
          code,
          parent_id: parentGroupId,
          attributes: selectedAttributes,
          sort_order: sortOrder as number,
        };
        await updateAttributeGroup(groupId, data);
      } else {
        await createAttributeGroup(
          "create",
          "",
          name,
          code,
          parentGroupId,
          selectedAttributes,
          sortOrder || 0,
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setIsLoading(false);
    }
  };

  const attributeOptions = attributes.map((attr) => ({
    value: attr._id || attr.id,
    label: attr.name,
  }));

  const parentGroupOptions = groups
    .filter((g) => (isEditing ? g._id !== groupId : true))
    .map((g) => ({
      value: g._id,
      label: g.name,
    }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Attribute Group" : "Create Attribute Group"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Group Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
            placeholder="e.g., Dimensions"
            disabled={isLoading}
          />
        </div>

        {/* Group Code */}
        <div>
          <label className="block text-sm font-medium mb-1">Code *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
            placeholder="e.g., dimensions"
            disabled={isLoading}
          />
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium mb-1">Sort Order</label>
          <input
            type="number"
            value={sortOrder ?? ""}
            onChange={(e) =>
              setSortOrder(e.target.value ? parseInt(e.target.value) : null)
            }
            className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
            placeholder="0"
            disabled={isLoading}
          />
        </div>

        {/* Parent Group */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Parent Group (Optional)
          </label>
          <Select
            options={parentGroupOptions}
            value={
              parentGroupId
                ? {
                    value: parentGroupId,
                    label:
                      groups.find((g) => g._id === parentGroupId)?.name ||
                      parentGroupId,
                  }
                : null
            }
            onChange={(option) => setParentGroupId(option?.value || "")}
            isClearable
            classNamePrefix="react-select"
            styles={selectStyles}
            isDisabled={isLoading}
            instanceId="parent-group-select"
          />
        </div>

        {/* Attributes Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Attributes</label>
          <div className="border border-border rounded-lg p-3 bg-card max-h-48 overflow-y-auto">
            {attributes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attributes available
              </p>
            ) : (
              <div className="space-y-2">
                {attributes.map((attr) => (
                  <label
                    key={attr._id || attr.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAttributes.includes(attr._id || attr.id)}
                      onChange={() =>
                        handleAttributeToggle(attr._id || attr.id)
                      }
                      disabled={isLoading}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">
                      {attr.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({attr.code})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
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
