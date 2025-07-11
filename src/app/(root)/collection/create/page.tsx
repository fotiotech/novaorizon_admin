"use client";

import React, { useState } from "react";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import { createCollection } from "@/app/actions/collection";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import CollectionRuleForm from "@/components/collections/RuleEditor";

const CreateCollection = () => {
  const { files, addFiles } = useFileUploader();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rules, setRules] = useState<any[]>([{ attribute: "name", operator: "$lt", value: "value", position: 0 }]);
  const [showJson, setShowJson] = useState(false);

  console.log('rules', rules);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const name = formData.get("name") as string;
      const category_id = formData.get("category_id") as string;
      const status = formData.get("status") as string;

      if (!name.trim()) {
        setError("Name is required");
        return;
      }

      if (!category_id) {
        setError("Category is required");
        return;
      }

      // Add rules
      formData.append("rules", JSON.stringify(rules));

      const result = await createCollection(formData);

      if (result.success) {
        setSuccess("Collection created successfully");
        setTimeout(() => {
          router.push("/collection");
        }, 1500);
      } else {
        setError(result.error || "Failed to create collection");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getJsonPreview = () => {
    const formEl = document.querySelector("form");
    if (!formEl) return "";

    const preview = {
      name:
        (formEl.querySelector('[name="name"]') as HTMLInputElement)?.value ||
        "",
      description:
        (formEl.querySelector('[name="description"]') as HTMLTextAreaElement)
          ?.value || "",
      category_id:
        (formEl.querySelector('[name="category_id"]') as HTMLInputElement)
          ?.value || "",
      status:
        (formEl.querySelector('[name="status"]') as HTMLSelectElement)?.value ||
        "active",
      rules,
    };

    return JSON.stringify(preview, null, 2);
  };



  return (
    <div className="p-2 lg:p-4">
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
        <h1 className="text-2xl font-bold">Create Collection</h1>
      </div>

      <div className="rounded-lg shadow p-6">
        <form action={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block mb-2">
              Name:
            </label>
            <input
              id="name"
              type="text"
              name="name"
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
              className="w-full bg-transparent border rounded-lg p-2"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="category_id" className="block mb-2">
              Category ID:
            </label>
            <input
              id="category_id"
              name="category_id"
              type="text"
              required
              className="w-full bg-transparent border rounded-lg p-2"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="status" className="block mb-2">
              Status:
            </label>
            <select
              name="status"
              id="status"
              className="w-full bg-transparent border rounded-lg p-2"
              defaultValue="active"
              disabled={isSubmitting}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="py-4 border-t border-b">
            <CollectionRuleForm rules={rules} onAddRule={setRules} />
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showJson ? "Hide" : "Show"} JSON Preview
            </button>

            {showJson && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-auto">{getJsonPreview()}</pre>
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
                  <span className="ml-2">Creating...</span>
                </span>
              ) : (
                "Create Collection"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCollection;
