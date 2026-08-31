"use client";

import React, { useEffect, useState } from "react";
import { deleteCategory, getCategory } from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import CategoryForm from "./_component/CategoryForm";
import CategoryList from "./_component/CategoryList";
import Link from "next/link";
import { Modal } from "@/components/ux/Modal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { Toaster, toast } from "sonner";

const Categories = () => {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  const getSubcategoriesForParent = (parentId: string) => {
    return categories.filter((cat) => cat.parent_id === parentId);
  };

  const categoriesWithSubcategories = categories.map((category) => ({
    ...category,
    subcategories: getSubcategoriesForParent(category._id as string),
  }));

  return (
    <div className=" space-y-6">
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

      {/* Error Display (fallback) */}
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

      {/* Loading State with Skeleton */}
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

      {/* Category List (always visible, below the modal) */}
      {!loading && (
        <CategoryList
          categories={categoriesWithSubcategories as any[]}
          title="All Categories"
          emptyMessage="No categories found. Create your first category!"
          onEditCategory={handleEditClick as any}
          onDeleteCategory={handleDeleteClick as any}
          showFilter={true}
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
