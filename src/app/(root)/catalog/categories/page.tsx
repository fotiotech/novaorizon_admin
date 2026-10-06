// app/catalog/categories/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  assignCategoryProperty,
  deleteCategory,
  getCategory,
  getCategoryAttributeSets,
  runCategoryInheritance,
} from "@/app/actions/category";
import {
  getCategoryProperty,
  type AttributeSetResult,
} from "@/app/actions/category_property";
import { getCategoryProductCounts } from "@/app/actions/products";
import { Category as Cat } from "@/constant/types";
import CategoryForm from "./_component/CategoryForm";
import CategoryList from "./_component/CategoryList";
import Link from "next/link";
import { Modal } from "@/components/ux/Modal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { Toaster, toast } from "sonner";
import {
  FilterList,
  Search,
  Add,
  Close,
  ListAlt,
  FolderOpen,
  Check,
} from "@mui/icons-material";
import PropertyViewerModal from "@/components/ux/PropertyViewerModal";

const Categories = () => {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>(
    {},
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Parent pre-selection for the "Add child" action.
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);

  const [filterText, setFilterText] = useState("");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // ---------- View mode: false = list, true = browse (drill-down) ----------
  const [browseMode, setBrowseMode] = useState(true);
  const [browsePath, setBrowsePath] = useState<string[]>([]);

  // ---------- Property viewer state ----------
  const [viewTarget, setViewTarget] = useState<Cat | null>(null);
  const [viewSets, setViewSets] = useState<AttributeSetResult[] | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ---------- Assign-property modal state ----------
  const [assignTarget, setAssignTarget] = useState<Cat | null>(null);
  const [assignPropertyId, setAssignPropertyId] = useState<string>("");
  const [assignProps, setAssignProps] = useState<any[] | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const assignSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
    fetchProductCounts();
  }, []);

  // -------------------------------------------------------------------
  //  Auto-enter the synthetic "All Category" root whenever browse mode
  //  is active and we're at the top level.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!browseMode) return;
    if (browsePath.length > 0) return;
    if (categories.length === 0) return;

    const roots = categories.filter((c) => {
      const pid = (c as any).parentId ?? (c as any).parent_id ?? null;
      return !pid;
    });
    if (roots.length === 0) return;

    const allRoot = roots.find((r) => {
      const n = (r.name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      return n === "all category" || n === "all categories";
    });

    const target = allRoot ?? (roots.length === 1 ? roots[0] : null);
    if (target) setBrowsePath([target._id as string]);
  }, [browseMode, browsePath.length, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await getCategory();
      setCategories(res || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories");
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductCounts = async () => {
    try {
      const counts = await getCategoryProductCounts();
      setProductCounts(counts || {});
    } catch (err) {
      console.error("Error fetching product counts:", err);
      // Silent — the column just shows 0.
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchCategories(), fetchProductCounts()]);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteCategory(id);
      if (result.success) {
        setCategories(categories.filter((cat) => cat._id !== id));
        setBrowsePath((prev) => (prev.includes(id) ? [] : prev));
        // Products whose category was unset → refresh counts.
        fetchProductCounts();
        toast.success("Category deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete category");
      }
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error("Failed to delete category");
    }
  };

  const handleDeleteClick = (category: Cat) => {
    setDeleteTarget(category);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      handleDelete(deleteTarget._id as string);
    }
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleEditClick = (category: Cat) => {
    setEditId(category._id as string);
    setParentIdForNew(null);
    setShowForm(true);
  };

  const handleNewCategory = () => {
    setEditId(null);
    setParentIdForNew(null);
    setShowForm(true);
  };

  // "Add child" — open the create form with the parent pre-selected.
  const handleAddChild = (category: Cat) => {
    setEditId(null);
    setParentIdForNew(category._id as string);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setParentIdForNew(null);
    setShowForm(false);
  };

  const handleSuccess = async () => {
    await refreshAll();
    setEditId(null);
    setParentIdForNew(null);
    setShowForm(false);
    toast.success(editId ? "Category updated" : "Category created");
  };

  // ---------- Run inheritance ----------
  const handleRunInheritance = async (category: Cat) => {
    const wasEnabled = !!category.inheritProperty;
    const toastId = toast.loading(
      wasEnabled ? "Re-running inheritance…" : "Enabling inheritance…",
    );

    try {
      const result = await runCategoryInheritance(category._id as string);

      if (result.success) {
        await fetchCategories();
        toast.dismiss(toastId);
        if (result.warning) {
          toast.info(result.warning);
        } else {
          toast.success(
            wasEnabled
              ? "Inheritance re-run — snapshot refreshed"
              : "Inheritance enabled",
          );
        }
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || "Failed to run inheritance");
      }
    } catch (err) {
      console.error("Error running inheritance:", err);
      toast.dismiss(toastId);
      toast.error("Failed to run inheritance");
    }
  };

  // ---------- View property ----------
  const handleViewProperty = async (category: Cat) => {
    setViewTarget(category);
    setViewSets(null);
    setViewLoading(true);

    try {
      const sets = await getCategoryAttributeSets(category._id as string);
      setViewSets(sets || []);
    } catch (err) {
      console.error("Error loading property:", err);
      toast.error("Failed to load property");
      setViewSets([]);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewer = () => {
    setViewTarget(null);
    setViewSets(null);
    setViewLoading(false);
  };

  // ---------- Assign / change property ----------
  const handleAssignProperty = async (category: Cat) => {
    const prop = (category as any).property;
    const currentId =
      typeof prop === "string"
        ? prop
        : prop && typeof prop === "object" && "_id" in prop
          ? (prop as any)._id
          : "";

    setAssignTarget(category);
    setAssignPropertyId(currentId || "");
    setAssignProps(null);
    setAssignLoading(true);
    setAssignSearch("");

    try {
      const props = await getCategoryProperty(); // readOnly ones are filtered out
      setAssignProps(props || []);
      // Focus the search box on next tick once the modal is rendered.
      setTimeout(() => assignSearchRef.current?.focus(), 50);
    } catch (err) {
      console.error("Failed to load properties:", err);
      toast.error("Failed to load properties");
      setAssignProps([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const closeAssignProperty = () => {
    setAssignTarget(null);
    setAssignPropertyId("");
    setAssignProps(null);
    setAssignSearch("");
    setAssignSaving(false);
  };

  const confirmAssignProperty = async () => {
    if (!assignTarget) return;
    setAssignSaving(true);
    try {
      const result = await assignCategoryProperty(
        assignTarget._id as string,
        assignPropertyId || null,
      );

      if (result.success) {
        await fetchCategories();
        toast.success("Property updated");
        closeAssignProperty();
      } else {
        toast.error(result.error || "Failed to assign property");
      }
    } catch (err) {
      console.error("Error assigning property:", err);
      toast.error("Failed to assign property");
    } finally {
      setAssignSaving(false);
    }
  };

  // Filtered + sorted property list for the picker.
  const filteredAssignProps = useMemo(() => {
    if (!assignProps) return [];
    const q = assignSearch.trim().toLowerCase();
    const list = q
      ? assignProps.filter((p: any) => {
          const name = (p.name || "").toLowerCase();
          const code = (p.code || "").toLowerCase();
          return name.includes(q) || code.includes(q);
        })
      : assignProps;
    return [...list].sort((a: any, b: any) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [assignProps, assignSearch]);

  // ---------- Browse handlers ----------
  const handleOpenCategory = (category: Cat) => {
    setBrowsePath((prev) => [...prev, category._id as string]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setBrowsePath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
  };

  const handleToggleMode = () => {
    setBrowseMode((prev) => !prev);
    setBrowsePath([]);
  };

  const hasActiveFilters = filterText.trim() !== "";
  const activeFilterCount = hasActiveFilters ? 1 : 0;

  const filterInputEl = (
    <div className="relative w-full">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        placeholder="Search categories…"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-clip">
      <Toaster position="top-right" richColors />

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
        {/* Mobile: 2×2 grid of controls */}
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative inline-flex items-center justify-center gap-2 rounded-lg bg-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Search</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleMode}
            aria-pressed={!browseMode}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
          >
            {browseMode ? (
              <>
                <ListAlt fontSize="small" />
                List
              </>
            ) : (
              <>
                <FolderOpen fontSize="small" />
                Browse
              </>
            )}
          </button>

          <Link
            href="/catalog/categories/property"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
          >
            Properties
          </Link>

          <button
            onClick={handleNewCategory}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add fontSize="small" />
            New category
          </button>
        </div>

        {/* Desktop */}
        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <div className="min-w-0 max-w-sm flex-1">{filterInputEl}</div>

          <button
            type="button"
            onClick={handleToggleMode}
            aria-pressed={!browseMode}
            title={browseMode ? "Switch to list view" : "Switch to browse view"}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
          >
            {browseMode ? (
              <>
                <ListAlt fontSize="small" />
                List
              </>
            ) : (
              <>
                <FolderOpen fontSize="small" />
                Browse
              </>
            )}
          </button>

          <Link
            href="/catalog/categories/property"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
          >
            Properties
          </Link>

          <button
            onClick={handleNewCategory}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add fontSize="small" />
            New category
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

      {/* Mobile filter sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search categories"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Search
            </label>
            {filterInputEl}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFilterText("")}
              disabled={!hasActiveFilters}
              className="flex-1 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
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

      {/* Loading skeleton */}
      {loading && (
        <div className="overflow-hidden rounded-lg bg-card">
          <div className="px-4 py-3">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="divide-y divide-border/60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-9 w-9 flex-none animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form modal */}
      <Modal
        isOpen={showForm || !!editId}
        onClose={handleCancelEdit}
        title={editId ? "Edit category" : "Create category"}
        size="xl"
      >
        <CategoryForm
          key={editId ?? parentIdForNew ?? "new"}
          categoryId={editId || undefined}
          categories={categories}
          initialParentId={parentIdForNew || undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancelEdit}
          mode={editId ? "edit" : "create"}
        />
      </Modal>

      {/* List */}
      {!loading && (
        <CategoryList
          categories={categories as any[]}
          productCounts={productCounts}
          title={browseMode ? "Browse categories" : "All categories"}
          emptyMessage="No categories found. Create your first category!"
          onEditCategory={handleEditClick as any}
          onDeleteCategory={handleDeleteClick as any}
          onRunInheritance={handleRunInheritance as any}
          onViewProperty={handleViewProperty as any}
          onAddChild={handleAddChild as any}
          onAssignProperty={handleAssignProperty as any}
          showFilter={true}
          hideFilter={true}
          filterValue={filterText}
          onFilterChange={setFilterText}
          filterPlaceholder="Search categories…"
          browseMode={browseMode}
          browsePath={browsePath}
          onOpenCategory={handleOpenCategory as any}
          onBreadcrumbClick={handleBreadcrumbClick}
        />
      )}

      {/* Property viewer */}
      <PropertyViewerModal
        isOpen={!!viewTarget}
        onClose={closeViewer}
        category={viewTarget as any}
        sets={viewSets}
        loading={viewLoading}
      />

      {/* Assign-property modal */}
      <Modal
        isOpen={!!assignTarget}
        onClose={closeAssignProperty}
        title={
          assignTarget
            ? `Property for "${assignTarget.name}"`
            : "Assign property"
        }
        size="md"
      >
        {assignTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Choose the property this category defines directly. Inheriting
              descendants will re-merge automatically.
            </p>

            {/* Search input */}
            <div className="relative">
              <Search
                fontSize="small"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={assignSearchRef}
                type="text"
                placeholder="Search properties…"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 pr-9 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              {assignSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setAssignSearch("");
                    assignSearchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <Close style={{ fontSize: 16 }} />
                </button>
              )}
            </div>

            {/* List */}
            {assignLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              </div>
            ) : !assignProps || assignProps.length === 0 ? (
              <div className="rounded-lg bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                No assignable properties found. Create one first.
              </div>
            ) : (
              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1">
                {/* None option — always present, always at top */}
                {!assignSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => setAssignPropertyId("")}
                    className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                      assignPropertyId === ""
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">None</span>
                      <span className="text-xs text-muted-foreground">
                        Clear the category&rsquo;s own property
                      </span>
                    </span>
                    {assignPropertyId === "" && (
                      <Check
                        fontSize="small"
                        className="flex-none text-primary"
                      />
                    )}
                  </button>
                )}

                {filteredAssignProps.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No properties match &ldquo;{assignSearch}&rdquo;
                  </div>
                ) : (
                  filteredAssignProps.map((p: any) => {
                    const selected = assignPropertyId === p._id;
                    return (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => setAssignPropertyId(p._id)}
                        className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{p.name}</span>
                          {p.code && (
                            <span className="truncate font-mono text-xs text-muted-foreground">
                              {p.code}
                            </span>
                          )}
                          {p.description && (
                            <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {p.description}
                            </span>
                          )}
                        </span>
                        {selected && (
                          <Check
                            fontSize="small"
                            className="flex-none text-primary"
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {assignPropertyId
                  ? `Selected: ${
                      assignProps?.find((p: any) => p._id === assignPropertyId)
                        ?.name ?? "—"
                    }`
                  : "No property selected"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeAssignProperty}
                  className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAssignProperty}
                  disabled={assignSaving || assignLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {assignSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Categories;
