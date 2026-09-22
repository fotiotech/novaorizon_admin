// app/catalog/categories/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  deleteCategory,
  getCategory,
  getCategoryAttributeSets,
  runCategoryInheritance,
} from "@/app/actions/category";
import type { AttributeSetResult } from "@/app/actions/category_property";
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
} from "@mui/icons-material";
import PropertyViewerModal from "@/components/ux/PropertyViewerModal";

const Categories = () => {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [filterText, setFilterText] = useState("");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // ---------- View mode: false = list, true = browse (drill-down) ----------
  const [browseMode, setBrowseMode] = useState(true);
  const [browsePath, setBrowsePath] = useState<string[]>([]);

  // ---------- Property viewer state ----------
  const [viewTarget, setViewTarget] = useState<Cat | null>(null);
  const [viewSets, setViewSets] = useState<AttributeSetResult[] | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  // -------------------------------------------------------------------
  //  Auto-enter the synthetic "All Category" root whenever browse mode
  //  is active and we're at the top level. The user should never see a
  //  level that only contains the single wrapper node.
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

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteCategory(id);
      if (result.success) {
        setCategories(categories.filter((cat) => cat._id !== id));
        setBrowsePath((prev) => (prev.includes(id) ? [] : prev));
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
    setShowForm(true);
  };

  const handleNewCategory = () => {
    setEditId(null);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    fetchCategories();
    setEditId(null);
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
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      <Toaster position="top-right" richColors />

      {/* -------------------------------------------------------------- */}
      {/* Controls — no title (top bar renders the page name)            */}
      {/* -------------------------------------------------------------- */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
        {/* Mobile: 2×2 grid of controls */}
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
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

        {/* Desktop: inline search · List/Browse · Properties · New */}
        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <div className="min-w-0 max-w-sm flex-1">{filterInputEl}</div>

          <button
            type="button"
            onClick={handleToggleMode}
            aria-pressed={!browseMode}
            title={browseMode ? "Switch to list view" : "Switch to browse view"}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
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
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
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

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => setFilterText("")}
              disabled={!hasActiveFilters}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="divide-y divide-border">
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
          categoryId={editId || undefined}
          categories={categories}
          onSuccess={handleSuccess}
          onCancel={handleCancelEdit}
          mode={editId ? "edit" : "create"}
        />
      </Modal>

      {/* List */}
      {!loading && (
        <CategoryList
          categories={categories as any[]}
          title={browseMode ? "Browse categories" : "All categories"}
          emptyMessage="No categories found. Create your first category!"
          onEditCategory={handleEditClick as any}
          onDeleteCategory={handleDeleteClick as any}
          onRunInheritance={handleRunInheritance as any}
          onViewProperty={handleViewProperty as any}
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
