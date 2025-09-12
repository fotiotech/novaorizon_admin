"use client";

import React, { useEffect, useState } from "react";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import {
  createCollection,
  getCollectionById,
  updateCollection,
} from "@/app/actions/collection";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import CollectionRuleForm from "@/components/collections/RuleEditor";
import { getCategory } from "@/app/actions/category";
import { getAllCollections } from "@/app/actions/collection";

const CollectionForm = ({ id }: { id?: string }) => {
  const { files, loading: load, addFiles, removeFile } = useFileUploader();
  const router = useRouter();
  const [collections, setCollections] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rules, setRules] = useState<any[]>([
    { attribute: "", operator: "$eq", value: "", position: 0 },
  ]);
  const [showJson, setShowJson] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    imageUrl: "",
    status: "active",
  });

  // Fetch categories and collection data
  useEffect(() => {
    async function fetchCollections() {
      try {
        setLoading(true);
        const result = await getAllCollections();
        if (result.success) {
          const mappedCollections = result.data || [];
          console.log({ mappedCollections });

          setCollections(mappedCollections);
        } else {
          setError(result.error || "Failed to fetch collections");
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();

    const fetchData = async () => {
      try {
        const [categoryData, collectionData] = await Promise.all([
          getCategory(),
          id ? getCollectionById(id) : Promise.resolve(null),
        ]);

        setCategories(categoryData);

        if (collectionData?.success && collectionData.data) {
          let data = Array.isArray(collectionData.data)
            ? collectionData.data[0]
            : collectionData.data;

          // Update form data with collection values
          setFormData({
            name: data.name || "",
            description: data.description || "",
            category_id: data.category_id?._id || data.category_id || "",
            imageUrl: data.imageUrl || "",
            status: data.status || "active",
          });

          if (data?.imageUrl) {
            addFiles([{ url: data.imageUrl, name: "existing-image" }] as any);
          }
          if (data?.rules) {
            setRules(
              data.rules.map((rule: any) => ({
                attribute: rule.attribute || "name",
                operator: rule.operator || "$eq",
                value: rule.value || "",
                position: rule.position || 0,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { name, category_id } = formData;

      if (!name.trim()) {
        setError("Name is required");
        return;
      }

      if (!category_id) {
        setError("Category is required");
        return;
      }

      // Validate rules
      const invalidRules = rules.some(
        (rule) => !rule.attribute || !rule.operator || !rule.value
      );

      if (invalidRules) {
        setError("Please complete all rule fields");
        return;
      }

      // Create FormData object
      const submitFormData = new FormData();
      submitFormData.append("name", formData.name);
      submitFormData.append("description", formData.description);
      submitFormData.append("category_id", formData.category_id);
      submitFormData.append("imageUrl", files[0]);
      submitFormData.append("status", formData.status);
      submitFormData.append("rules", JSON.stringify(rules));

      let result;
      if (id) {
        result = await updateCollection(id, submitFormData);
      } else {
        result = await createCollection(submitFormData);
      }

      if (result.success) {
        setSuccess(
          id
            ? "Collection updated successfully"
            : "Collection created successfully"
        );
        setTimeout(() => {
          router.push("/content_merchandising/collection");
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || "Failed to save collection");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {error && (
        <Notification
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <Notification
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {id ? "Edit" : "Create"} Collection
        </h1>
        <p className="text-gray-600 mt-1">
          {id ? "Update" : "Create a new"} product collection with custom rules
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                name="name"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
                placeholder="Enter collection name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Category *
              </label>
              <select
                title="category_id"
                name="category_id"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
                value={formData.category_id}
                onChange={handleInputChange}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              placeholder="Enter collection description"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Image
            </label>
            <FilesUploader
              files={files}
              loading={loading}
              addFiles={addFiles}
              removeFile={removeFile}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Status
            </label>
            <select
              title="status"
              name="status"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="py-6 ">
            <CollectionRuleForm rules={rules} onAddRule={setRules} />
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <svg
                className={`w-4 h-4 mr-1 transition-transform ${
                  showJson ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {showJson ? "Hide" : "Show"} JSON Preview
            </button>

            {showJson && (
              <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                <pre className="text-sm overflow-auto max-h-60 p-3 bg-gray-800 text-gray-100 rounded">
                  {JSON.stringify(
                    {
                      name: formData.name,
                      description: formData.description,
                      category_id: formData.category_id,
                      status: formData.status,
                      rules,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.push("/collection")}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 px-5 py-2.5 rounded-lg text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Spinner />
                  <span className="ml-2">
                    {id ? "Updating..." : "Creating..."}
                  </span>
                </span>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {id ? "Update Collection" : "Create Collection"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionForm;
