"use client";

import React, { useEffect, useState } from "react";
import { deleteCategory, getCategory } from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import CategoryForm from "./_component/CategoryForm";
import CategoryList from "./_component/CategoryList";
import Link from "next/link";
import { Modal } from "@/components/ux/Modal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { Toaster, toast } from "sonner";
import { FilterList, Search } from "@mui/icons-material";

const Categories = () => {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Shared filter state — drives both desktop input and mobile sheet input.
  const [filterText, setFilterText] = useState("");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const hasActiveFilters = filterText.trim() !== "";
  const activeFilterCount = hasActiveFilters ? 1 : 0;

  // ---------- SAFE TREE BUILDER (prevents infinite recursion) ----------
  const buildSafeSubtree = (
    parentId: string,
    visited: Set<string> = new Set(),
    depth = 0,
  ): any[] => {
    if (depth > 10 || visited.has(parentId)) return [];
    visited.add(parentId);

    return categories
      .filter((cat) => cat.parentId === parentId && cat._id !== parentId)
      .map((cat) => ({
        ...cat,
        subcategories: buildSafeSubtree(
          cat._id as string,
          new Set(visited),
          depth + 1,
        ),
      }));
  };

  const categoriesWithSubcategories = categories.map((category) => {
    if (!category.parentId) {
      return {
        ...category,
        subcategories: buildSafeSubtree(category._id as string),
      };
    }

    return {
      ...category,
      subcategories: [],
    };
  });

  // Shared filter input — reused in desktop bar and mobile sheet.
  const filterInputEl = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 !h-4 !w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search categories..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className="w-full p-2 pl-8 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
            Categories
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your product categories and subcategories
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Mobile-only: opens the bottom-sheet filter UI */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="lg:hidden relative inline-flex items-center gap-2 px-4 py-2 font-semibold bg-card border border-border rounded-lg hover:bg-muted transition text-foreground"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Search</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Link
            href="/catalog/categories/property"
            className="px-4 py-2 font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            + Property
          </Link>
          <button onClick={handleNewCategory} className="btn">
            + New Category
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <strong className="font-bold">Error:</strong>
          <span className="ml-2">{error}</span>
          <button
            onClick={() => setError(null)}
            className="float-right text-destructive hover:text-destructive/80"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Desktop-only inline filter */}
      <div className="hidden lg:block">{filterInputEl}</div>

      {/* Mobile-only filter bottom-sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search Categories"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Search
            </label>
            {filterInputEl}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setFilterText("")}
              disabled={!hasActiveFilters}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
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

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-card p-6 rounded-lg shadow-md border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
              <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                  <div className="flex-1"></div>
                  <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Form in Modal */}
      <Modal
        isOpen={showForm || !!editId}
        onClose={handleCancelEdit}
        title={editId ? "Edit Category" : "Create Category"}
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

      {/* Category List — filter is controlled from above */}
      {!loading && (
        <CategoryList
          categories={categoriesWithSubcategories as any[]}
          title="All Categories"
          emptyMessage="No categories found. Create your first category!"
          onEditCategory={handleEditClick as any}
          onDeleteCategory={handleDeleteClick as any}
          showFilter={true}
          hideFilter={true}
          filterValue={filterText}
          onFilterChange={setFilterText}
          filterPlaceholder="Search categories..."
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.${
          (deleteTarget as any)?.subcategories?.length
            ? ` It has ${(deleteTarget as any).subcategories.length} subcategory(ies) that will also be removed.`
            : ""
        }`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Categories;
