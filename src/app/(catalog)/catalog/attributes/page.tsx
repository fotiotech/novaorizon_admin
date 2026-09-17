"use client";

import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  Delete,
  Edit,
  FilterList,
  Search,
  SearchOff,
  Tune,
  MoreVert,
  Add,
  Close,
} from "@mui/icons-material";
import {
  deleteAttribute,
  findAttributesAndValues,
} from "@/app/actions/attributes";
import { AttributeFormModal } from "./_component/AttributeFormModal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";

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

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

// ------------------------------------------------------------------
// Theme-aware react-select styles (matches the rest of the app)
// ------------------------------------------------------------------
const SELECT_STYLES = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.25)" : "none",
    minHeight: "38px",
    fontSize: "0.875rem",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    "&:hover": {
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--border))",
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    overflow: "hidden",
    boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
  }),
  menuPortal: (provided: any) => ({ ...provided, zIndex: 9999 }),
  menuList: (provided: any) => ({ ...provided, padding: 4 }),
  option: (provided: any, state: any) => ({
    ...provided,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected
      ? "hsl(var(--primary))"
      : state.isFocused
        ? "hsl(var(--accent))"
        : "hsl(var(--popover))",
    color: state.isSelected
      ? "hsl(var(--primary-foreground))"
      : "hsl(var(--popover-foreground))",
    cursor: "pointer",
    borderRadius: "0.375rem",
  }),
  singleValue: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  placeholder: (p: any) => ({ ...p, color: "hsl(var(--muted-foreground))" }),
  input: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  indicatorSeparator: (p: any) => ({
    ...p,
    backgroundColor: "hsl(var(--border))",
  }),
  dropdownIndicator: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    "&:hover": { color: "hsl(var(--foreground))" },
  }),
} as const;

const PORTAL_PROPS = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  menuPosition: "fixed" as const,
  menuShouldScrollIntoView: false,
} as const;

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

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

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
    const sorted = [...filtered].sort((a, b) =>
      sortAttrOrder.value === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
    return sorted;
  }, [attributes, filterText, sortAttrOrder]);

  const formatOptions = (option: any): string => {
    if (!option) return "—";
    if (Array.isArray(option)) {
      if (option.length === 0) return "—";
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

  const hasActiveFilters =
    filterText.trim() !== "" || sortAttrOrder.value !== "asc";

  const activeFilterCount =
    (filterText.trim() !== "" ? 1 : 0) +
    (sortAttrOrder.value !== "asc" ? 1 : 0);

  const handleClearFilters = () => {
    setFilterText("");
    setSortAttrOrder({ value: "asc", label: "A → Z" });
  };

  const getMenuItems = (attr: AttributeType): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit attribute",
      icon: <Edit fontSize="small" />,
      onClick: () => handleEditClick(attr._id!),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => handleDeleteClick(attr._id!, attr.name),
    },
  ];

  // ---------------- Early exits ----------------
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Shared filter controls — reused in desktop bar and mobile sheet
  const filterInputEl = (
    <div className="relative">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        placeholder="Filter attributes…"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );

  const sortSelectEl = (
    <Select
      options={sortOptions}
      value={sortAttrOrder}
      onChange={(opt) => setSortAttrOrder(opt as Option)}
      classNamePrefix="react-select"
      styles={SELECT_STYLES}
      isSearchable={false}
      instanceId="attribute-sort"
      {...PORTAL_PROPS}
    />
  );

  return (
    <div className="mx-auto max-w-6xl py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Attributes
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage product attribute definitions and their options
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:hidden"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={handleNewAttribute}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:flex-initial"
          >
            <Add fontSize="small" />
            New attribute
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>
            <strong className="font-medium">Error:</strong> {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="rounded p-0.5 transition hover:bg-destructive/10"
            aria-label="Dismiss error"
          >
            <Close fontSize="small" />
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span>
            <strong className="font-medium">Success:</strong> {success}
          </span>
          <button
            onClick={() => setSuccess(null)}
            className="rounded p-0.5 transition hover:bg-emerald-500/10"
            aria-label="Dismiss"
          >
            <Close fontSize="small" />
          </button>
        </div>
      )}

      {/* Desktop filter bar */}
      <div className="hidden sm:block">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-6">{filterInputEl}</div>
            <div className="lg:col-span-3">{sortSelectEl}</div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end border-t border-border pt-3">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Close fontSize="small" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Filter & Sort"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Filter
            </label>
            {filterInputEl}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Sort by name
            </label>
            {sortSelectEl}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              All attributes
            </h2>
            {visibleAttributes.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visibleAttributes.length}
              </span>
            )}
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Unit family
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sort order
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Options
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleAttributes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        {filterText.trim() ? (
                          <SearchOff className="text-muted-foreground" />
                        ) : (
                          <Tune className="text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {filterText.trim()
                          ? "No attributes match your search"
                          : "No attributes yet"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {filterText.trim()
                          ? "Try adjusting or clearing your filter."
                          : "Create your first attribute to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleAttributes.map((attr) => (
                  <tr
                    key={attr._id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-[180px] truncate text-sm font-medium text-foreground">
                        {attr.name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                        {attr.code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-muted-foreground">
                        {attr.unitFamily?.name || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                        {attr.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-muted-foreground">
                        {attr.sort_order}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div
                        className="max-w-[220px] truncate text-sm text-muted-foreground"
                        title={formatOptions(attr.option)}
                      >
                        {formatOptions(attr.option)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end">
                        <PopoverMenu
                          items={getMenuItems(attr)}
                          ariaLabel={`Actions for ${attr.name}`}
                          trigger={<MoreVert fontSize="small" />}
                          align="right"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
        title="Delete attribute"
        message={`Are you sure you want to delete the attribute "${deleteTargetName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Attributes;
