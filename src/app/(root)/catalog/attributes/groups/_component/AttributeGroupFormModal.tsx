// app/catalog/attributes/groups/_component/AttributeGroupFormModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ux/Modal";
import Select from "react-select";
import {
  createAttributeGroup,
  findGroup,
  updateAttributeGroup,
} from "@/lib/api/attribute-group";
import { Save, Cancel } from "@mui/icons-material";

interface AttributeGroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId?: string;
  groups: any[];
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
};

function toMessage(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors) {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Failed to save group";
}

export const AttributeGroupFormModal: React.FC<
  AttributeGroupFormModalProps
> = ({ isOpen, onClose, onSuccess, groupId, groups }) => {
  const isEditing = !!groupId;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState<number | null>(null);
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
            setSortOrder(groupData.sortOrder ?? null);
          }
          setError(null);
        } catch (err: any) {
          setError(toMessage(err));
        } finally {
          setIsLoading(false);
        }
      };
      fetchGroupData();
    } else {
      setName("");
      setCode("");
      setSortOrder(null);
      setParentGroupId("");
      setError(null);
    }
  }, [isEditing, groupId, isOpen]);

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
        await updateAttributeGroup(groupId, {
          name,
          code,
          parentId: parentGroupId || null,
          sortOrder: sortOrder ?? 0,
        });
      } else {
        await createAttributeGroup({
          name,
          code,
          parentId: parentGroupId || null,
          sortOrder: sortOrder ?? 0,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(toMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-3 sm:px-4 rounded">
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
