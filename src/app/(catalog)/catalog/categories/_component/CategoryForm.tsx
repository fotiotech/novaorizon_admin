"use client";

import React, { ChangeEvent, useEffect, useState, useRef } from "react";
import FilesUploader from "@/components/FilesUploader";
import {
  getCategory,
  createCategory,
  getCategoryProperty,
  deleteCategoryImage,
} from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import { useFileUploader } from "@/hooks/useFileUploader";
import { toast } from "react-toastify";

// Simple inline validation
const validateCategory = (data: Partial<Cat>) => {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = "Name is required";
  if (data.name && data.name.length < 2)
    errors.name = "Name must be at least 2 characters";
  return errors;
};

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
    parentId: "",
    description: "",
    imageUrl: [],
    property: "",
  });
  const [attributes, setAttributes] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [inheritProperty, setInheritProperty] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ---------- Searchable parent selector state ----------
  const [parentSearch, setParentSearch] = useState("");
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const parentDropdownRef = useRef<HTMLDivElement>(null);

  // File uploader
  const {
    files,
    loading: fileLoading,
    addFiles,
    setFiles,
  } = useFileUploader(
    undefined,
    mode === "edit" && categoryData.imageUrl ? categoryData.imageUrl : [],
    undefined,
  );

  const handleRemoveImage = async (index: number, fileUrl: string) => {
    if (mode === "edit" && categoryId) {
      const result = await deleteCategoryImage(categoryId, fileUrl);
      if (!result.success) {
        toast.error(result.error || "Failed to remove image");
        return;
      }
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setCategoryData((prev) => ({
        ...prev,
        imageUrl: prev.imageUrl?.filter((url) => url !== fileUrl) || [],
      }));
    } else {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Fetch properties
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

  // Fetch category data for edit
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
              parentId: category.parentId || "",
              description: category.description || "",
              imageUrl: category.imageUrl || [],
              property: category.property?._id || category.property || "",
            });
            setSelectedPropertyId(
              category.property?._id || category.property || "",
            );
            // ✅ Load inheritProperty from the fetched category
            setInheritProperty(category.inheritProperty ?? false);
            if (category.attributes) setAttributes(category.attributes);
            if (category.imageUrl && category.imageUrl.length > 0) {
              setFiles(category.imageUrl);
            } else {
              setFiles([]);
            }
            // Set search input to the parent name (if any)
            if (category.parentId) {
              const parent: any = categories.find(
                (c) => c._id === category.parentId,
              );
              setParentSearch(parent ? parent.name : "");
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
  }, [categoryId, mode, setFiles, categories]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        parentDropdownRef.current &&
        !parentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsParentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setCategoryData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = validateCategory(categoryData);
    if (errors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: errors[field] }));
    }
  };

  const handleToggleChange = () => {
    setInheritProperty((prev) => !prev);
  };

  // ---------- Parent selector handlers ----------
  const filteredParents = categories.filter((cat: any) => {
    const matchesQuery = cat.name
      .toLowerCase()
      .includes(parentSearch.toLowerCase());
    const isCurrentCategory = categoryId && cat._id === categoryId;
    return matchesQuery && !isCurrentCategory;
  });

  const selectParent = (cat: any) => {
    if (categoryId && cat._id === categoryId) return;
    setCategoryData((prev) => ({ ...prev, parentId: cat._id || "" }));
    setParentSearch(cat.name);
    setIsParentDropdownOpen(false);
    if (fieldErrors.parentId) {
      setFieldErrors((prev) => ({ ...prev, parentId: "" }));
    }
  };

  const clearParent = () => {
    setCategoryData((prev) => ({ ...prev, parentId: "" }));
    setParentSearch("");
    setIsParentDropdownOpen(false);
  };

  const handleParentInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setParentSearch(e.target.value);
    setIsParentDropdownOpen(true);
    if (e.target.value === "") {
      setCategoryData((prev) => ({ ...prev, parentId: "" }));
    }
  };

  const handleParentFocus = () => {
    setIsParentDropdownOpen(true);
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validateCategory(categoryData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const allTouched = Object.keys(categoryData).reduce(
        (acc, key) => {
          acc[key] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setTouched(allTouched);
      toast.error("Please fix the validation errors");
      return;
    }

    setIsLoading(true);

    try {
      const formData = {
        ...categoryData,
        imageUrl: files || [],
        attributes: attributes || [],
        propertyId: selectedPropertyId || undefined,
        inheritProperty: inheritProperty,
      };

      const result = await createCategory(
        formData,
        mode === "edit" ? categoryData._id : undefined,
      );

      if (result && !result.error) {
        onSuccess();
      } else {
        setError(result?.error || "Error while processing category");
        toast.error(result?.error || "Error while processing category");
      }
    } catch (err) {
      console.error("Error saving category:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to save category";
      setError(msg);
      toast.error(msg);
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
        parentId: "",
        description: "",
        imageUrl: [],
        property: "",
      });
      setSelectedPropertyId("");
      setAttributes(null);
      setError(null);
      setInheritProperty(false);
      setFiles([]);
      setFieldErrors({});
      setTouched({});
      setParentSearch("");
      setIsParentDropdownOpen(false);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Basic Information */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Basic Information
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Parent Category - Searchable Combobox */}
          <div>
            <label htmlFor="parentSearch" className="block mb-1 font-medium">
              Parent Category
            </label>
            <div className="relative" ref={parentDropdownRef}>
              <input
                id="parentSearch"
                type="text"
                placeholder="Search for parent category..."
                value={parentSearch}
                onChange={handleParentInputChange}
                onFocus={handleParentFocus}
                className={`w-full p-2 rounded-lg border ${
                  fieldErrors.parentId && touched.parentId
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-gray-100 dark:bg-gray-700 dark:text-white pr-8`}
              />
              {parentSearch && (
                <button
                  type="button"
                  onClick={clearParent}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              )}
              {isParentDropdownOpen && filteredParents.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredParents.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => selectParent(cat)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
              {isParentDropdownOpen &&
                filteredParents.length === 0 &&
                parentSearch !== "" && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                    No categories match
                  </div>
                )}
            </div>
            {fieldErrors.parentId && touched.parentId && (
              <p className="text-red-500 text-xs mt-1">
                {fieldErrors.parentId}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Type to search and select a parent category (leave empty for
              root).
            </p>
          </div>

          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">
              Category Name *
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={categoryData.name}
              onChange={handleInputChange}
              onBlur={() => handleBlur("name")}
              className={`w-full p-2 rounded-lg border ${
                fieldErrors.name && touched.name
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } bg-gray-100 dark:bg-gray-700 dark:text-white`}
              required
            />
            {fieldErrors.name && touched.name && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Property & Inheritance */}
      <fieldset className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
        <legend className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Category Property &amp; Inheritance
        </legend>

        <div>
          <label htmlFor="property" className="block mb-1 font-medium">
            Category Property
          </label>
          <select
            id="property"
            name="property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className={`w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-white ${
              inheritProperty ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={inheritProperty} // disable when inheritance is on
          >
            <option value="">None</option>
            {properties.map((prop) => (
              <option key={prop._id} value={prop._id}>
                {prop.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {inheritProperty
              ? "Inheritance enabled – manual selection is ignored."
              : "Select a property to associate attribute sets with this category."}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Inherit Properties from Parent Categories
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              When enabled, this category will combine its own property with all
              ancestors' properties (child overrides parent).
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
                inheritProperty ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
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
        <div className="mt-1">
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
          {inheritProperty && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              ℹ️ A new property will be auto‑generated from ancestor mappings.
            </p>
          )}
        </div>
      </fieldset>

      {/* Media */}
      <fieldset className="space-y-2">
        <legend className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Images
        </legend>
        <FilesUploader
          files={files}
          loading={fileLoading}
          addFiles={addFiles}
          onRemove={handleRemoveImage}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Upload one or more category images.
        </p>
      </fieldset>

      {/* Description */}
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
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-white"
          placeholder="Brief description (optional)"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 rounded transition disabled:opacity-50"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded transition disabled:opacity-50"
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
  );
};

export default CategoryForm;
