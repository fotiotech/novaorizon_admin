"use client";

import React, { useState, useEffect } from "react";
import {
  createAttributeSet,
  getAttributeSet,
  updateAttributeSet,
} from "@/app/actions/attribute_sets";

interface AttributeSetFormProps {
  attributeSetId?: string; // if provided, we're in edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

const AttributeSetForm: React.FC<AttributeSetFormProps> = ({
  attributeSetId,
  onSuccess,
  onCancel,
}) => {
  const isEditing = !!attributeSetId;

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [sort_order, setSortOrder] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing attribute set data when editing
  useEffect(() => {
    if (isEditing && attributeSetId) {
      const fetchSet = async () => {
        setIsFetching(true);
        try {
          const data: any = await getAttributeSet(attributeSetId);
          setTitle(data.title);
          setCode(data.code);
          setDescription(data.description || "");
          setSortOrder(data.sort_order || 0);
        } catch (err: any) {
          console.error("Failed to fetch attribute set:", err);
          setError(err.message || "Could not load attribute set");
        } finally {
          setIsFetching(false);
        }
      };
      fetchSet();
    }
  }, [attributeSetId, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Code is required");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        code: code.trim(),
        description: description.trim() || undefined,
        sort_order: sort_order || 0,
      };

      let result;
      if (isEditing && attributeSetId) {
        result = await updateAttributeSet(attributeSetId, payload);
      } else {
        result = await createAttributeSet(payload);
      }

      if (result.success) {
        onSuccess();
      } else {
        setError("Failed to save attribute set");
      }
    } catch (err: any) {
      console.error("Error submitting attribute set:", err);
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-lg font-semibold mb-4">
        {isEditing ? "Edit Attribute Set" : "Create Attribute Set"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            placeholder="e.g., Product Dimensions"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Code *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            placeholder="e.g., product-dimensions"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Sort Order</label>
          <input
            type="number"
            value={sort_order || ""}
            onChange={(e) =>
              setSortOrder(e.target.value ? parseInt(e.target.value) : null)
            }
            className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            placeholder="e.g., 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            rows={2}
            placeholder="Optional description"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
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
            {isLoading
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
                ? "Update Set"
                : "Create Set"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AttributeSetForm;
