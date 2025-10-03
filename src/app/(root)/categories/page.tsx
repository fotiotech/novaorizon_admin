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
        "Are you sure you want to delete this category? This action cannot be undone."
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

  // Get subcategories for a specific parent category
  const getSubcategoriesForParent = (parentId: string) => {
    return categories.filter((cat) => cat.parent_id === parentId);
  };

  // Enhanced categories with subcategories data
  const categoriesWithSubcategories = categories.map((category) => ({
    ...category,
    subcategories: getSubcategoriesForParent(category._id as string),
  }));

  return (
    <div className=" lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Categories
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your product categories and subcategories
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={"/attributes/group_attribute_category"}
            className="px-4 py-2 font-semibold bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Manage Attributes
          </Link>
          <button
            onClick={handleNewCategory}
            className="px-4 py-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + New Category
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <strong className="font-bold">Error:</strong>
          <span className="ml-2">{error}</span>
          <button
            onClick={() => setError(null)}
            className="float-right text-red-800 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Category Form */}
      {(showForm || editId) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
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
            categories={categoriesWithSubcategories}
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
