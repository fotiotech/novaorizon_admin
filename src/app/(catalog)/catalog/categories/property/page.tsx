"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Select from "react-select";
import { FilterList, Search } from "@mui/icons-material";
import {
  getCategoryProperty,
  deleteCategoryProperty,
} from "@/app/actions/category";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { toast } from "sonner";

interface Property {
  _id: string;
  name: string;
  description?: string;
  sets?: any[];
  mappings?: any[];
  createdAt: string;
  updatedAt: string;
}

interface SortOption {
  value: "name_asc" | "name_desc" | "newest" | "oldest";
  label: string;
}

export default function CategoryPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter / sort
  const [filterText, setFilterText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOption>({
    value: "name_asc",
    label: "Name A → Z",
  });

  // Mobile bottom sheet
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await getCategoryProperty();
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

  // Theme-aware react-select styles — consistent with other catalog pages
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
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  // Shared filter controls — reused in desktop bar and mobile sheet
  const filterInputEl = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 !h-4 !w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search properties..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className="w-full p-2 pl-8 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
      />
    </div>
  );

  const sortSelectEl = (
    <Select<SortOption>
      options={sortOptions}
      value={sortOrder}
      onChange={(opt) => opt && setSortOrder(opt as SortOption)}
      classNamePrefix="react-select"
      styles={selectStyles}
      isSearchable={false}
      instanceId="property-sort"
      menuPortalTarget={
        typeof document !== "undefined" ? document.body : undefined
      }
      menuPosition="fixed"
    />
  );

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-56 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                <div className="flex-1" />
                <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
          <span>
            <strong className="font-bold">Error: </strong>
            {error}
          </span>
          <button
            onClick={() => void fetchProperties()}
            className="text-sm font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Category Properties
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mobile-only: opens the bottom-sheet filter UI */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="sm:hidden relative inline-flex items-center justify-center gap-2 flex-1 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-muted transition text-foreground"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Link
            href="/catalog/categories/property/create"
            className="btn inline-flex items-center justify-center gap-1 flex-1 sm:flex-initial"
          >
            <span>+</span> New Property
          </Link>
        </div>
      </div>

      {/* Desktop-only inline filter & sort */}
      <div className="mb-4 hidden sm:flex gap-3 items-center">
        <div className="flex-1">{filterInputEl}</div>
        <div className="w-56">{sortSelectEl}</div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-md transition-colors"
            title="Clear filters"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile-only filter bottom sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search & Sort"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Search
            </label>
            {filterInputEl}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Sort by
            </label>
            {sortSelectEl}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Table / empty state */}
      {properties.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No properties found. Create your first one!</p>
          <Link
            href="/catalog/categories/property/create"
            className="text-primary hover:underline text-sm mt-2 inline-block"
          >
            Create a property
          </Link>
        </div>
      ) : visibleProperties.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No properties match your search.</p>
          <button
            onClick={handleClearFilters}
            className="text-primary hover:underline text-sm mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-card text-card-foreground shadow overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Mappings
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {visibleProperties.map((prop) => (
                  <tr
                    key={prop._id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">
                        {prop.name}
                      </div>
                      {prop.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {prop.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/15 text-primary">
                        {prop.mappings?.length || prop.sets?.length || 0} sets
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                      <Link
                        href={`/catalog/categories/property/${prop._id}/edit`}
                        className="text-primary hover:text-primary/80 transition-colors mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(prop)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Category Property"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this property"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        danger
      />
    </div>
  );
}
