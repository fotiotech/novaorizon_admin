"use client";

import React, { useEffect, useState } from "react";
import { deleteCategory, getCategory } from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import CategoryForm from "./_component/CategoryForm";

const Categories = () => {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [subCategory, setSubcategory] = useState<Cat[] | null>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSubcategories = async () => {
      if (catId) {
        try {
          const subCatRes = await getCategory(null, catId, null);
          setSubcategory(subCatRes || []);
        } catch (err) {
          console.error("Error fetching subcategories:", err);
        }
      }
    };

    fetchSubcategories();
  }, [catId]);

  const fetchCategories = async () => {
    try {
      const res = await getCategory();
      setCategories(res);
      setError(null);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
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

  const handleEditClick = (id: string) => {
    setEditId(id);
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

  return (
    <div className="lg:p-8 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold my-2 text-gray-800 dark:text-gray-100">
          Categories
        </h2>
        <button
          onClick={handleNewCategory}
          className="p-2 font-semibold bg-blue-600 text-white rounded"
        >
          + New Category
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Show form when creating or editing */}
      {(showForm || editId) && (
        <CategoryForm
          categoryId={editId || undefined}
          categories={categories}
          onSuccess={handleSuccess}
          onCancel={handleCancelEdit}
          mode={editId ? "edit" : "create"}
        />
      )}

      {/* Categories List */}
      {!showForm && !editId && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold text-lg mb-4">Categories</h3>
              <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto scrollbar-thin">
                {categories.map((cat) => (
                  <li
                    key={cat._id}
                    className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <span
                      onClick={() => setCatId(cat._id as string)}
                      className="flex-1 cursor-pointer font-medium hover:text-blue-600"
                    >
                      {cat.name}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(cat._id as string)}
                        className="px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat._id as string)}
                        className="px-2 py-1 border rounded text-red-600 hover:bg-red-50 dark:hover:bg-gray-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Subcategories</h3>
              <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto scrollbar-thin">
                {subCategory?.map((sub) => (
                  <li
                    key={sub._id}
                    className="p-2 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    {sub.name}
                  </li>
                ))}
                {(!subCategory || subCategory.length === 0) && (
                  <li className="p-2 text-gray-500">No subcategories found</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
