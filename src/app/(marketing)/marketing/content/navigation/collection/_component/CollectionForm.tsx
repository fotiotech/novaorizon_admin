"use client";

import React, { useEffect, useState } from "react";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import {
  createCollection,
  getCollectionById,
  updateCollection,
  deleteCollectionImage,
  fetchAvailableItems,
} from "@/app/actions/collection";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import CollectionRuleForm from "./RuleEditor";
import { getAllCollections } from "@/app/actions/collection";

const CollectionForm = ({ id }: { id?: string }) => {
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
  const [items, setItems] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    status: "active",
    type: "rule",
    targetType: "Product",
    order: 0,
    showName: true,
    recommendationType: "",
    recommendationLimit: 10,
  });

  // Determine if rule mode is allowed based on targetType
  const isRuleAllowed = ["Product", "Collection"].includes(formData.targetType);

  // When targetType changes, reset type to manual if rule not allowed
  useEffect(() => {
    if (
      ["recommendation", "related"].includes(formData.type) &&
      formData.targetType !== "Product"
    ) {
      setFormData((prev) => ({ ...prev, targetType: "Product" }));
      setRules([]);
      setItems([]);
      return;
    }

    if (!isRuleAllowed && formData.type === "rule") {
      setFormData((prev) => ({ ...prev, type: "manual" }));
      setRules([]);
    }
  }, [formData.targetType, formData.type, isRuleAllowed]);

  const buildFormData = (
    data: typeof formData,
    rulesData: any[],
    itemsData: string[],
  ) => {
    const fd = new FormData();
    fd.append("name", data.name);
    fd.append("description", data.description);
    fd.append("imageUrl", data.imageUrl || "");
    fd.append("status", data.status);
    fd.append("type", data.type);
    fd.append("targetType", data.targetType);
    fd.append("rules", JSON.stringify(rulesData));
    fd.append("items", JSON.stringify(itemsData));
    fd.append("order", data.order.toString());
    fd.append("showName", data.showName ? "true" : "false");
    fd.append("recommendationType", data.recommendationType);
    fd.append("recommendationLimit", data.recommendationLimit.toString());
    return fd;
  };

  // Use "collections" as subfolder
  const {
    files,
    loading: fileLoading,
    addFiles,
    setFiles,
  } = useFileUploader(
    id,
    formData.imageUrl ? [formData.imageUrl] : [],
    "collections",
  );

  useEffect(() => {
    const uploadedUrl = files[0] || "";
    if (uploadedUrl !== formData.imageUrl) {
      setFormData((prev) => ({
        ...prev,
        imageUrl: uploadedUrl,
      }));
    }
  }, [files, formData.imageUrl]);

  const handleRemoveImage = async (index: number, fileUrl: string) => {
    if (id) {
      const result = await deleteCollectionImage(id);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove image");
      }
      setFiles([]);
      setFormData((prev) => ({ ...prev, imageUrl: "" }));
      setSuccess("Image removed successfully");
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    async function fetchCollections() {
      try {
        setLoading(true);
        const result = await getAllCollections();
        if (result.success) {
          setCollections(result.data || []);
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
        if (id) {
          const collectionData = await getCollectionById(id);
          if (collectionData?.success && collectionData.data) {
            const data: any = collectionData.data;
            setFormData({
              name: data.name || "",
              description: data.description || "",
              imageUrl: data.imageUrl || "",
              status: data.status || "active",
              type: data.type || "rule",
              targetType: data.targetType || "Product",
              order: data.order || 0,
              showName: data.showName !== undefined ? data.showName : true,
              recommendationType: data.recommendationType || "",
              recommendationLimit: data.recommendationLimit || 10,
            });
            setRules(
              data.rules || [
                { attribute: "", operator: "$eq", value: "", position: 0 },
              ],
            );
            const itemIds = data.items
              ? data.items.map((item: any) => {
                  if (item && typeof item === "object" && item._id) {
                    return item._id.toString();
                  }
                  return item;
                })
              : [];
            setItems(itemIds);
            if (data.imageUrl) {
              setFiles([data.imageUrl]);
            } else {
              setFiles([]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, setFiles]);

  // Fetch available items for manual selection
  useEffect(() => {
    if (formData.type === "manual" && formData.targetType) {
      fetchAvailableItems(formData.targetType, itemSearch)
        .then((res) => {
          if (res.success) {
            setAvailableItems(res.data || []);
          }
        })
        .catch(console.error);
    }
  }, [formData.targetType, formData.type, itemSearch]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const toggleItem = (itemId: string) => {
    setItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const {
        name,
        type,
        targetType,
        recommendationType,
        recommendationLimit,
      } = formData;

      if (!name.trim()) {
        setError("Name is required");
        return;
      }

      if (type === "rule") {
        if (!isRuleAllowed) {
          setError(
            "Rule-based collections are only allowed for Products and Collections.",
          );
          return;
        }
        const invalidRules = rules.some(
          (rule) => !rule.attribute || !rule.operator || !rule.value,
        );
        if (invalidRules) {
          setError("Please complete all rule fields");
          return;
        }
      }

      // Validate recommendation and related types
      if (type === "recommendation" || type === "related") {
        if (type === "recommendation" && !recommendationType) {
          setError("Please select a recommendation type");
          return;
        }
        if (recommendationLimit < 1) {
          setError("Item limit must be at least 1");
          return;
        }
      }

      const submitFormData = buildFormData(formData, rules, items);

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
            : "Collection created successfully",
        );
        setTimeout(() => {
          router.push("/marketing/content/navigation/collection");
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
          {id ? "Update" : "Create a new"} collection – rule‑based, manual,
          recommendation, or related
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
                Type *
              </label>
              <select
                name="type"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                value={formData.type}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="rule" disabled={!isRuleAllowed}>
                  Rule‑based {!isRuleAllowed && "(not allowed for this target)"}
                </option>
                <option value="manual">Manual selection</option>
                <option value="recommendation">Recommendation</option>
                <option value="related">Related (product context)</option>
              </select>
              {!isRuleAllowed && (
                <p className="text-sm text-amber-600 mt-1">
                  Rule‑based collections are only available for Products and
                  Collections.
                </p>
              )}
            </div>
          </div>

          {/* Recommendation configuration */}
          {formData.type === "recommendation" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Recommendation Type *
                </label>
                <select
                  name="recommendationType"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  value={formData.recommendationType}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="">Select type</option>
                  <option value="trending">Trending (global)</option>
                  <option value="personalized">
                    Personalized (user-based)
                  </option>
                  <option value="recentlyViewed">Recently Viewed</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Max Items
                </label>
                <input
                  type="number"
                  name="recommendationLimit"
                  min={1}
                  max={100}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  value={formData.recommendationLimit}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Number of items to return (default 10)
                </p>
              </div>
            </div>
          )}

          {/* Related configuration (product context) */}
          {formData.type === "related" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="col-span-2">
                <p className="text-sm text-gray-600 mb-2">
                  This collection will show products related to the current
                  product (based on the product's <code>related_products</code>{" "}
                  field or fallback to same category/brand).
                </p>
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Max Items
                </label>
                <input
                  type="number"
                  name="recommendationLimit"
                  min={1}
                  max={100}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  value={formData.recommendationLimit}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Number of related products to return (default 10)
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Target *
              </label>
              <select
                name="targetType"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                value={formData.targetType}
                onChange={handleInputChange}
                disabled={
                  isSubmitting ||
                  formData.type === "recommendation" ||
                  formData.type === "related"
                } // Disable for recommendation and related
              >
                <option value="Category">Category</option>
                <option value="Product">Product</option>
                <option value="Brand">Brand</option>
                <option value="Collection">Collection</option>
                <option value="Promotion">Promotion</option>
                <option value="Page">Page</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {formData.type === "recommendation" ||
                formData.type === "related"
                  ? "This type always targets Products."
                  : formData.targetType === "Product" ||
                      formData.targetType === "Collection"
                    ? "Rules/items will apply to this target type."
                    : "Only manual selection is available for this target type."}
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Order (lower = higher priority)
              </label>
              <input
                type="number"
                name="order"
                min={0}
                step={1}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                value={formData.order}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <p className="text-sm text-gray-500 mt-1">
                Collections are sorted by this number (ascending) when
                displayed.
              </p>
            </div>
          </div>

          {/* Show Name Checkbox */}
          <div className="flex items-center space-x-3">
            <div
              className="w-5 h-5 border-2 border-gray-300 rounded bg-white flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() =>
                setFormData((prev) => ({ ...prev, showName: !prev.showName }))
              }
            >
              {formData.showName && (
                <svg
                  className="w-3.5 h-3.5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <label
              className="font-medium text-gray-700 cursor-pointer"
              onClick={() =>
                setFormData((prev) => ({ ...prev, showName: !prev.showName }))
              }
            >
              Show collection name in rendered output
            </label>
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
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
              loading={fileLoading}
              addFiles={addFiles}
              onRemove={handleRemoveImage}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {formData.type === "rule" ? (
            <div className="py-6">
              <CollectionRuleForm
                rules={rules}
                onAddRule={setRules}
                targetType={formData.targetType as "Product" | "Collection"}
              />
            </div>
          ) : formData.type === "manual" ? (
            <div className="py-4 border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">
                Select {formData.targetType}s
              </h3>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder={`Search ${formData.targetType.toLowerCase()}s...`}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="max-h-60 overflow-y-auto border rounded">
                {availableItems.length === 0 ? (
                  <p className="p-4 text-gray-500">No items found.</p>
                ) : (
                  availableItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center p-2 hover:bg-gray-50 border-b"
                    >
                      <div
                        className="w-5 h-5 border-2 border-gray-300 rounded bg-white flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors mr-3 flex-shrink-0"
                        onClick={() => toggleItem(item._id)}
                      >
                        {items.includes(item._id) && (
                          <svg
                            className="w-3.5 h-3.5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span>{item.name || "Unnamed"}</span>
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="ml-auto h-8 w-8 object-cover rounded"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {items.length} selected
              </div>
            </div>
          ) : null}

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
                      type: formData.type,
                      targetType: formData.targetType,
                      status: formData.status,
                      order: formData.order,
                      showName: formData.showName,
                      ...(formData.type === "rule" && { rules }),
                      ...(formData.type === "manual" && { items }),
                      ...(formData.type === "recommendation" && {
                        recommendationType: formData.recommendationType,
                        recommendationLimit: formData.recommendationLimit,
                      }),
                      ...(formData.type === "related" && {
                        recommendationLimit: formData.recommendationLimit,
                      }),
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() =>
                router.push("/marketing/content/navigation/collection")
              }
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary px-5 py-2.5 rounded-lg text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
