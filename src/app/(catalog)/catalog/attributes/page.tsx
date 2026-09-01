"use client";

import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Delete, Edit } from "@mui/icons-material";
import {
  deleteAttribute,
  findAttributesAndValues,
} from "@/app/actions/attributes";
import { AttributeFormModal } from "./_component/AttributeFormModal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";

type AttributeType = {
  _id?: string;
  code: string;
  unitFamily?: { name: string; symbol: string; _id: string } | null;
  name: string;
  option?: string | string[] | any[];
  type: string;
  sort_order: number;
};

interface Option {
  value: string;
  label: string;
}

const Attributes = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [sortAttrOrder, setSortAttrOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>("");
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const response = await findAttributesAndValues();
      if (response?.length > 0) {
        setAttributes(response as unknown as AttributeType[]);
        setError(null);
      } else {
        setAttributes([]);
      }
    } catch (err) {
      console.error("[Attributes] Error fetching data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load attributes",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAttributeSuccess = () => {
    fetchAttributes();
    setEditingAttributeId(null);
    setIsFormModalOpen(false);
    setSuccess("Attribute saved successfully!");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEditClick = (id: string) => {
    setEditingAttributeId(id);
    setIsFormModalOpen(true);
  };

  const handleNewAttribute = () => {
    setEditingAttributeId(null);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteAttribute(deleteTargetId);
      fetchAttributes();
      setSuccess("Attribute deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeleteTargetId("");
      setDeleteTargetName("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting attribute:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete attribute",
      );
    }
  };

  const sortOptions: Option[] = [
    { value: "asc", label: "A → Z" },
    { value: "desc", label: "Z → A" },
  ];

  const visibleAttributes = useMemo(() => {
    const filtered = attributes.filter((a) =>
      a.name.toLowerCase().includes(filterText.toLowerCase()),
    );
    const sorted = filtered.sort((a, b) =>
      sortAttrOrder.value === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
    return sorted;
  }, [attributes, filterText, sortAttrOrder]);

  const formatOptions = (option: any): string => {
    if (!option) return "-";
    if (Array.isArray(option)) {
      if (option.length === 0) return "-";
      if (typeof option[0] === "object" && option[0] !== null) {
        return option
          .map(
            (item) =>
              item.name || item.value || item.label || JSON.stringify(item),
          )
          .join(", ");
      }
      return option.join(", ");
    }
    if (typeof option === "string") {
      if (option.includes(",")) {
        return option
          .split(",")
          .map((s) => s.trim())
          .join(", ");
      }
      return option;
    }
    return String(option);
  };

  // Theme-aware react-select styles using CSS variables
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
      backgroundColor: state.isFocused
        ? "hsl(var(--muted))"
        : "hsl(var(--card))",
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

  if (loading) {
    return (
      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-10 w-28 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-md border border-border">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
                <div className="h-6 w-20 bg-muted animate-pulse rounded"></div>
                <div className="h-6 w-28 bg-muted animate-pulse rounded"></div>
                <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-6 w-12 bg-muted animate-pulse rounded"></div>
                <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
                <div className="h-6 w-20 bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="font-bold text-xl text-foreground my-2">Attributes</h2>
        <button
          onClick={handleNewAttribute}
          className="btn inline-flex items-center gap-1"
        >
          <span>+</span> Attribute
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Success:</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      {/* Filter & Sort */}
      <div className="my-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text"
          placeholder="Filter attributes..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full sm:w-1/2 p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
        />
        <div className="w-full sm:w-1/4">
          <Select
            options={sortOptions}
            value={sortAttrOrder}
            onChange={(opt) => setSortAttrOrder(opt as Option)}
            classNamePrefix="react-select"
            styles={selectStyles}
            isSearchable={false}
            instanceId="attribute-sort"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unit Family
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sort Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Options
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {visibleAttributes.map((attr) => (
                <tr
                  key={attr._id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4 max-w-[150px] truncate">
                    <div className="text-sm font-medium text-foreground">
                      {attr.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[150px] truncate">
                    <div className="text-sm text-muted-foreground">
                      {attr.code}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground">
                      {attr.unitFamily?.name || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground">
                      {attr.type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground">
                      {attr.sort_order}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px] truncate">
                    <div
                      className="text-sm text-muted-foreground"
                      title={formatOptions(attr.option)}
                    >
                      {formatOptions(attr.option)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEditClick(attr._id!)}
                        className="text-primary hover:text-primary/80 transition-colors"
                        aria-label={`Edit attribute ${attr.name}`}
                      >
                        <Edit fontSize="small" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(attr._id!, attr.name)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                        aria-label={`Delete attribute ${attr.name}`}
                      >
                        <Delete fontSize="small" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleAttributes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {filterText
              ? "No attributes match your search"
              : "No attributes found"}
          </div>
        )}
      </div>

      {/* Attribute Form Modal */}
      <AttributeFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingAttributeId(null);
        }}
        onSuccess={handleAttributeSuccess}
        attributeId={editingAttributeId || undefined}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId("");
          setDeleteTargetName("");
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Attribute"
        message={`Are you sure you want to delete the attribute "${deleteTargetName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Attributes;
