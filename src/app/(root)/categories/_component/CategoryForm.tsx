"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import FilesUploader from "@/components/FilesUploader";
import { getCategory, createCategory } from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import { useFileUploader } from "@/hooks/useFileUploader";
import { v4 as uuidv4 } from "uuid";

interface CategoryFormProps {
  categoryId?: string; // Only receive ID for updates
  categories: Cat[]; // List of all categories for parent selection
  onSuccess: () => void;
  onCancel?: () => void;
  mode?: "create" | "edit"; // Explicit mode control
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  categoryId,
  categories,
  onSuccess,
  onCancel,
  mode = "create",
}) => {
  const [categoryData, setCategoryData] = useState<Cat>({
    _id: "",
    name: "",
    parent_id: "",
    description: "",
    imageUrl: [],
    attributes: [],
  });
  const { files, loading, addFiles, removeFile } = useFileUploader();
  const [attributes, setAttributes] = useState<any | null>(null);
  const [toggleCreateAttribute, setToggleCreateAttribute] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch category data if in edit mode
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (mode === "edit" && categoryId) {
        try {
          setIsLoading(true);
          const category = await getCategory(categoryId);

          if (category) {
            setCategoryData({
              _id: category._id || "",
              name: category.name || "",
              parent_id: category.parent_id || "",
              description: category.description || "",
              imageUrl: category.imageUrl || [],
              attributes: category.attributes || [],
            });

            // Set attributes if they exist
            if (category.attributes) {
              setAttributes(category.attributes);
            }

            // Load existing images if any
            if (category.imageUrl && category.imageUrl.length > 0) {
              addFiles(category.imageUrl);
            }
          } else {
            setError("Category not found");
          }
        } catch (err) {
          console.error("Error fetching category:", err);
          setError("Failed to load category data");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchCategoryData();
  }, [categoryId, mode, addFiles]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCategoryData((prev) => ({ ...prev, [name]: value }));
  };

  // In your CategoryForm component, fix the handleSubmit function:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Prepare form data - ensure arrays are never undefined
      const formData = {
        ...categoryData,
        imageUrl: files || [], // Use empty array if no files
        attributes: attributes || [], // Use empty array if no attributes
      };

      // Create or update category
      const result = await createCategory(
        formData,
        mode === "edit" ? categoryData._id : undefined
      );

      if (result && !result.error) {
        onSuccess();
      } else {
        setError(result?.error || "Error while processing category");
      }
    } catch (err) {
      console.error("Error saving category:", err);
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Reset form
      setCategoryData({
        _id: "",
        name: "",
        parent_id: "",
        description: "",
        imageUrl: [],
        attributes: [],
      });
      setAttributes(null);
      setToggleCreateAttribute(false);
      setError(null);
    }
  };

  if (isLoading && mode === "edit") {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-800 shadow rounded-xl p-4">
      <h2 className="text-2xl font-bold my-2 text-gray-800 dark:text-gray-100">
        {mode === "edit" ? "Edit Category" : "Create Category"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="parent_id" className="block mb-1 font-medium">
              Parent Category
            </label>
            <select
              title="parentCategory"
              name="parent_id"
              value={categoryData.parent_id}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select Parent Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="name" className="block mb-1 font-medium">
              Category Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={categoryData.name}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <FilesUploader
            files={files}
            loading={loading}
            addFiles={addFiles}
            removeFile={removeFile}
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-1 font-medium">
            Description
          </label>
          <input
            id="description"
            type="text"
            name="description"
            value={categoryData.description}
            onChange={handleInputChange}
            className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {mode === "edit" ? "Updating..." : "Creating..."}
              </>
            ) : mode === "edit" ? (
              "Update Category"
            ) : (
              "Create Category"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;
