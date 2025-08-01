"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import { getCollectionById, updateCollection } from "@/app/actions/collection";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import CollectionRuleForm from "@/components/collections/RuleEditor";
import { getCategory } from "@/app/actions/category";

const EditCollection = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { files, addFiles } = useFileUploader();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [collection, setCollection] = useState<any | null>(null);
  const [rules, setRules] = useState<any[]>([
    { attribute: "name", operator: "$lt", value: "value", position: 0 },
  ]);
  const [showJson, setShowJson] = useState(false);
  const [category, setCategory] = useState<any[]>([]);

  useEffect(() => {
    // Fetch categories or any initial data if needed
    async function fetchCat() {
      const res = await getCategory();
      setCategory(res);
    }
    fetchCat();
  }, []);

  useEffect(() => {
    async function fetchCollection() {
      if (!id) return;
      const result = await getCollectionById(id);
      if (result.success && result.data) {
        let collectionData = result.data;
        if (Array.isArray(collectionData)) {
          collectionData = collectionData[0];
        }
        setCollection(collectionData);
        if (collectionData?.imageUrl) {
          addFiles([collectionData.imageUrl] as unknown as File[]);
        }
        if (
          collectionData?.rules &&
          JSON.stringify(collectionData.rules) !== JSON.stringify(rules)
        ) {
          setRules(
            collectionData.rules.map((rule: any) => ({
              ...rule,
              attribute: rule.attribute || "name",
              operator: rule.operator || "$eq",
              value: rule.value || "",
              position: rule.position || 0,
            }))
          );
        }
      }
      setLoading(false);
    }
    fetchCollection();
  }, [id, addFiles]);

  const handleSubmit = async (formData: FormData) => {
    if (!id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (files?.length > 0) {
        formData.append("imageUrl", files[0].toString());
      } else if (collection?.imageUrl) {
        formData.append("imageUrl", collection.imageUrl);
      }

      formData.append("rules", JSON.stringify(rules));

      const result = await updateCollection(id, formData);

      if (result.success) {
        setSuccess("Collection updated successfully");
        setTimeout(() => {
          router.push("/collection");
        }, 1500);
      } else {
        setError(result.error || "Failed to update collection");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="p-2 lg:p-4">
        <div className="text-center text-red-600">Collection not found</div>
      </div>
    );
  }

  return (
    <div className="p-4">
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
        <h1 className="text-2xl font-bold">Edit Collection</h1>
      </div>

      <div className=" rounded-lg shadow p-6">
        <div className="mb-6">
          <FilesUploader files={files} addFiles={addFiles} />
        </div>

        <form action={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block mb-2">
                Name:
              </label>
              <input
                id="name"
                type="text"
                name="name"
                defaultValue={collection.name}
                className="w-full bg-transparent border rounded-lg p-2"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="description" className="block mb-2">
                Description:
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={collection.description}
                className="w-full bg-transparent border rounded-lg p-2"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="display" className="block mb-2">
                Display Format:
              </label>
              <select
                id="display"
                name="display"
                className="w-full bg-transparent border rounded-lg p-2"
                defaultValue={collection.display || "product"}
                required
                disabled={isSubmitting}
              >
                <option value="grid">grid</option>
                <option value="category">category</option>
                <option value="carrousel">product carrousel</option>
              </select>
            </div>

            <div>
              <label htmlFor="category_id" className="block mb-2">
                Category ID:
              </label>
              <select
                id="category_id"
                name="category_id"
                defaultValue={collection.category_id}
                className="w-full bg-transparent border rounded-lg p-2"
                disabled={isSubmitting}
              >
                {category.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={collection.status === "active"}
                  className="rounded"
                  disabled={isSubmitting}
                />
                <span>Active</span>
              </label>
            </div>

            <div className="py-4 border-t border-b">
              <CollectionRuleForm rules={rules} onAddRule={setRules} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowJson(!showJson)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showJson ? "Hide" : "Show"} JSON Preview
                </button>
              </div>

              {showJson && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(
                      {
                        name: collection.name,
                        description: collection.description,
                        status: collection.status,
                        rules,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push("/collection")}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-thiR px-4 py-2 rounded-lg text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <Spinner />
                    <span className="ml-2">Updating...</span>
                  </span>
                ) : (
                  "Update Collection"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCollection;
