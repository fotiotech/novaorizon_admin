"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Select from "react-select";
import {
  FilterList,
  Search,
  SearchOff,
  Layers,
  Edit,
  Delete,
  MoreVert,
  Add,
  Close,
  Lock,
} from "@mui/icons-material";
import {
  getCategoryProperty,
  deleteCategoryProperty,
} from "@/app/actions/category_property";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "sonner";

interface Property {
  _id: string;
  name: string;
  description?: string;
  sets?: any[];
  mappings?: any[];
  readOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SortOption {
  value: "name_asc" | "name_desc" | "newest" | "oldest";
  label: string;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

// ------------------------------------------------------------------
// Theme-aware react-select styles
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

export default function CategoryPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filterText, setFilterText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOption>({
    value: "name_asc",
    label: "Name A → Z",
  });

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      // Include system-managed (read-only) docs so they're visible and
      // properly badged. Edits / deletes are blocked at the action layer.
      const data = await getCategoryProperty(undefined, {
        includeReadOnly: true,
      });
      setProperties(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching category properties:", err);
      setError("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDeleteClick = (property: Property) => {
    setDeleteTarget(property);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteCategoryProperty(deleteTarget._id);
      if (result.success) {
        setProperties((prev) => prev.filter((p) => p._id !== deleteTarget._id));
        toast.success(`"${deleteTarget.name}" deleted`);
      } else {
        toast.error(result.error || "Failed to delete property");
      }
    } catch (err) {
      console.error("Error deleting category property:", err);
      toast.error("An error occurred while deleting the property");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const sortOptions: SortOption[] = [
    { value: "name_asc", label: "Name A → Z" },
    { value: "name_desc", label: "Name Z → A" },
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
  ];

  const visibleProperties = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    let list = properties;

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortOrder.value) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        default:
          return 0;
      }
    });
    return sorted;
  }, [properties, filterText, sortOrder]);

  const hasActiveFilters =
    filterText.trim() !== "" || sortOrder.value !== "name_asc";
  const activeFilterCount =
    (filterText.trim() !== "" ? 1 : 0) +
    (sortOrder.value !== "name_asc" ? 1 : 0);

  const handleClearFilters = () => {
    setFilterText("");
    setSortOrder({ value: "name_asc", label: "Name A → Z" });
  };

  const getMenuItems = (prop: Property): PopoverMenuItem[] => {
    // Read-only (system-managed) properties: no Edit / Delete — they
    // are regenerated from the parent tree via the category's
    // "Re-run inheritance" action.
    if (prop.readOnly) {
      return [
        {
          key: "managed",
          label: "System-managed (read-only)",
          icon: <Lock fontSize="small" />,
          onClick: () => {},
        },
      ];
    }

    return [
      {
        key: "edit",
        label: "Edit property",
        icon: <Edit fontSize="small" />,
        href: `/catalog/categories/property/${prop._id}/edit`,
      },
      {
        key: "delete",
        label: "Delete",
        icon: <Delete fontSize="small" />,
        danger: true,
        onClick: () => handleDeleteClick(prop),
      },
    ];
  };

  // ---------------- Early exits ----------------
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="flex-1" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-8 w-8 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchProperties()}
            className="mt-4 rounded-lg border border-destructive/40 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Shared filter controls
  const filterInputEl = (
    <div className="relative">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        placeholder="Search properties…"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );

  const sortSelectEl = (
    <Select<SortOption>
      options={sortOptions}
      value={sortOrder}
      onChange={(opt) => opt && setSortOrder(opt as SortOption)}
      classNamePrefix="react-select"
      styles={SELECT_STYLES}
      isSearchable={false}
      instanceId="property-sort"
      {...PORTAL_PROPS}
    />
  );

  return (
    <div className="mx-auto max-w-7xl py-4">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Category properties
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage property sets and their category mappings
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

          <Link
            href="/catalog/categories/property/create"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:flex-initial"
          >
            <Add fontSize="small" />
            New property
          </Link>
        </div>
      </div>

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
        title="Search & Sort"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Search
            </label>
            {filterInputEl}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Sort by
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

      {/* Card */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              All properties
            </h2>
            {visibleProperties.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visibleProperties.length}
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
                  Mappings
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleProperties.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        {filterText.trim() ? (
                          <SearchOff className="text-muted-foreground" />
                        ) : (
                          <Layers className="text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {filterText.trim()
                          ? "No properties match your search"
                          : "No properties yet"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {filterText.trim()
                          ? "Try adjusting or clearing your search."
                          : "Create your first property to get started."}
                      </p>
                      <div className="mt-4">
                        {filterText.trim() ? (
                          <button
                            onClick={handleClearFilters}
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                          >
                            Clear filters
                          </button>
                        ) : (
                          <Link
                            href="/catalog/categories/property/create"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                          >
                            <Add fontSize="small" />
                            New property
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleProperties.map((prop) => (
                  <tr
                    key={prop._id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {prop.name}
                        </span>
                        {prop.readOnly && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            title="System-managed. Regenerated from parent categories via Re-run inheritance."
                          >
                            <Lock style={{ fontSize: 10 }} />
                            Inherited
                          </span>
                        )}
                      </div>
                      {prop.description && (
                        <div className="mt-0.5 line-clamp-1 max-w-md text-xs text-muted-foreground">
                          {prop.description}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {prop.mappings?.length || prop.sets?.length || 0} sets
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="flex justify-end">
                        <PopoverMenu
                          items={getMenuItems(prop)}
                          ariaLabel={`Actions for ${prop.name}`}
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

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete category property"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this property"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
}
