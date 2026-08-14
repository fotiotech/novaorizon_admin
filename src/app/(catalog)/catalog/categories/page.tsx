"use client";

import React, { useEffect, useState } from "react";
import { deleteCategory, getCategory } from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import CategoryForm from "./_component/CategoryForm";
import CategoryList from "./_component/CategoryList";
import Link from "next/link";

const Categories = () => {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this category? This action cannot be undone.",
      )
    ) {
      try {
        const result = await deleteCategory(id);
        if (result.success) {
          setCategories(categories.filter((cat) => cat._id !== id));
        } else {
          setError(result.error || "Failed to delete category");
        }
      } catch (err) {
        console.error("Error deleting category:", err);
        setError("Failed to delete category");
      }
    }
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
  };

  const getSubcategoriesForParent = (parentId: string) => {
    return categories.filter((cat) => cat.parent_id === parentId);
  };

  const categoriesWithSubcategories = categories.map((category) => ({
    ...category,
    subcategories: getSubcategoriesForParent(category._id as string),
  }));

  return (
    <div className="p-6 lg:p-8 space-y-6">
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
            className="px-4 py-2 font-semibold bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
          >
            + New Property
          </Link>
          <button
            onClick={handleNewCategory}
            className="px-4 py-2 font-semibold bg-pri-500 hover:bg-pri-600 text-white rounded-lg transition-colors"
          >
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
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pri-500"></div>
        </div>
      )}

      {/* Category Form */}
      {(showForm || editId) && (
        <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6">
          <CategoryForm
            categoryId={editId || undefined}
            categories={categories}
            onSuccess={handleSuccess}
            onCancel={handleCancelEdit}
            mode={editId ? "edit" : "create"}
          />
        </div>
      )}

      {/* Categories Table */}
      {!showForm && !editId && (
        <div className="space-y-6">
          <CategoryList
            categories={categoriesWithSubcategories as any[]}
            title="All Categories"
            emptyMessage="No categories found. Create your first category!"
            onEditCategory={handleEditClick}
            onDeleteCategory={handleDelete}
            showFilter={true}
            filterPlaceholder="Search categories..."
          />
        </div>
      )}
    </div>
  );
};

export default Categories;
