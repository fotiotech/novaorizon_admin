"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import FilesUploader from "@/components/FilesUploader";
import {
  getCategory,
  createCategory,
  getCategoryProperty,
  deleteCategoryImage, // new action
} from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import { useFileUploader } from "@/hooks/useFileUploader";

interface CategoryFormProps {
  categoryId?: string;
  categories: Cat[];
  onSuccess: () => void;
  onCancel?: () => void;
  mode?: "create" | "edit";
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
    property: "",
  });
  const [attributes, setAttributes] = useState<any | null>(null);
  const [toggleCreateAttribute, setToggleCreateAttribute] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [inheritProperty, setInheritProperty] = useState<boolean>(false);

  // ----- File Uploader (simplified, no callback) -----
  const {
    files,
    loading: fileLoading,
    addFiles,
    setFiles,
  } = useFileUploader(
    undefined, // instanceId
    mode === "edit" && categoryData.imageUrl ? categoryData.imageUrl : [], // initialFiles
    undefined, // subfolder
  );

  // Handle image removal – calls server action
  const handleRemoveImage = async (index: number, fileUrl: string) => {
    if (mode === "edit" && categoryId) {
      // Edit mode: delete from database and S3
      const result = await deleteCategoryImage(categoryId, fileUrl);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove image");
      }
      // Update local state – remove the image from the array
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setCategoryData((prev) => ({
        ...prev,
        imageUrl: prev.imageUrl?.filter((url) => url !== fileUrl) || [],
      }));
    } else {
      // Create mode: just remove from local state
      setFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Fetch available category properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const props = await getCategoryProperty();
        setProperties(props || []);
      } catch (err) {
        console.error("Failed to fetch category properties:", err);
      }
    };
    fetchProperties();
  }, []);

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
              property: category.property?._id || category.property || "",
            });
            setSelectedPropertyId(
              category.property?._id || category.property || "",
            );
            if (category.attributes) setAttributes(category.attributes);
            // Set initial files
            if (category.imageUrl && category.imageUrl.length > 0) {
              setFiles(category.imageUrl);
            } else {
              setFiles([]);
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
  }, [categoryId, mode, setFiles]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setCategoryData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = () => {
    setInheritProperty((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = {
        ...categoryData,
        imageUrl: files || [],
        attributes: attributes || [],
        propertyId: selectedPropertyId || undefined,
        inheritProperty: inheritProperty,
      };

      console.log(
        "[CategoryForm] Submitting with inheritProperty:",
        inheritProperty,
      );

      const result = await createCategory(
        formData,
        mode === "edit" ? categoryData._id : undefined,
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
      setCategoryData({
        _id: "",
        name: "",
        parent_id: "",
        description: "",
        imageUrl: [],
        property: "",
      });
      setSelectedPropertyId("");
      setAttributes(null);
      setToggleCreateAttribute(false);
      setError(null);
      setInheritProperty(false);
      setFiles([]);
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
              id="parent_id"
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

        {/* Category Property Selection */}
        <div>
          <label htmlFor="property" className="block mb-1 font-medium">
            Category Property
          </label>
          <select
            id="property"
            name="property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
          >
            <option value="">None</option>
            {properties.map((prop) => (
              <option key={prop._id} value={prop._id}>
                {prop.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Select a property to associate attribute sets with this category.
          </p>
        </div>

        {/* Inheritance Toggle */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Inherit Properties from Parent Categories
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                When enabled, this category will combine its own property with
                all ancestors' properties (child overrides parent).
              </p>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <span
                className={`text-sm font-medium ${
                  !inheritProperty
                    ? "text-gray-700 dark:text-gray-300"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                No
              </span>
              <button
                type="button"
                onClick={handleToggleChange}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  inheritProperty
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
                role="switch"
                aria-checked={inheritProperty}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    inheritProperty ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  inheritProperty
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                Yes
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                inheritProperty
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {inheritProperty
                ? "✓ Inheritance enabled"
                : "✗ Inheritance disabled"}
            </span>
          </div>
        </div>

        <div>
          <FilesUploader
            files={files}
            loading={fileLoading}
            addFiles={addFiles}
            onRemove={handleRemoveImage}
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
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
