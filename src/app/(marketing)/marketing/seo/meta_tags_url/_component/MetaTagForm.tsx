// components/MetaTagForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createMetaTag,
  updateMetaTag,
  getMetaTagById,
} from "@/app/actions/meta-tag-actions";
import { MetaTagFormData } from "@/constant/types/metatag";

interface MetaTagFormProps {
  mode: "create" | "edit";
  metaTagId?: string;
}

const MetaTagForm: React.FC<MetaTagFormProps> = ({ mode, metaTagId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MetaTagFormData>({
    url: "",
    urlPattern: "",
    title: "",
    description: "",
    keywords: "",
    canonicalUrl: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: "",
    robots: "index, follow",
    priority: 0.5,
    changeFrequency: "weekly",
    isActive: true,
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load meta tag data for edit mode
  useEffect(() => {
    if (mode === "edit" && metaTagId) {
      loadMetaTag();
    }
  }, [mode, metaTagId]);

  const loadMetaTag = async () => {
    setLoading(true);
    try {
      const result = await getMetaTagById(metaTagId!);
      if (result.success && result.data) {
        const metaTag = result.data;
        setFormData({
          url: metaTag.url,
          urlPattern: metaTag.urlPattern || "",
          title: metaTag.title,
          description: metaTag.description,
          keywords: metaTag.keywords?.join(", ") || "",
          canonicalUrl: metaTag.canonicalUrl || "",
          ogTitle: metaTag.ogTitle || "",
          ogDescription: metaTag.ogDescription || "",
          ogImage: metaTag.ogImage || "",
          ogType: metaTag.ogType || "website",
          twitterCard: metaTag.twitterCard || "summary_large_image",
          twitterTitle: metaTag.twitterTitle || "",
          twitterDescription: metaTag.twitterDescription || "",
          twitterImage: metaTag.twitterImage || "",
          robots: metaTag.robots || "index, follow",
          priority: metaTag.priority,
          changeFrequency: metaTag.changeFrequency,
          isActive: metaTag.isActive,
        });
      } else {
        showMessage("error", result.error || "Failed to load meta tag");
      }
    } catch (error) {
      showMessage("error", "Error loading meta tag");
    }
    setLoading(false);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userId = "admin-user-id"; // Replace with actual user ID from auth
      let result;

      if (mode === "edit" && metaTagId) {
        result = await updateMetaTag(metaTagId, formData);
      } else {
        result = await createMetaTag(formData);
      }

      if (result.success) {
        showMessage(
          "success",
          mode === "edit"
            ? "Meta tag updated successfully"
            : "Meta tag created successfully"
        );
        // Redirect back to list after short delay
        setTimeout(() => {
          router.push("/admin/meta-tags");
        }, 1500);
      } else {
        showMessage("error", result.error || "Operation failed");
      }
    } catch (error) {
      showMessage("error", "Error saving meta tag");
    }
    setLoading(false);
  };

  const handleChange = (
    field: keyof MetaTagFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading && mode === "edit") {
    return <div className="p-8 text-center">Loading meta tag...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {mode === "edit" ? "Edit Meta Tag" : "Create New Meta Tag"}
        </h1>
        <button
          onClick={() => router.push("/admin/meta-tags")}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to List
        </button>
      </div>

      {message && (
        <div
          className={`p-4 mb-4 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded shadow">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium mb-1">URL *</label>
              <input
                type="text"
                required
                value={formData.url}
                onChange={(e) => handleChange("url", e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="/example-page"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                URL Pattern (Regex)
              </label>
              <input
                type="text"
                value={formData.urlPattern}
                onChange={(e) => handleChange("urlPattern", e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="/products/.*"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use regex pattern for dynamic URLs
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                required
                maxLength={60}
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Page Title (max 60 chars)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/60 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description *
              </label>
              <textarea
                required
                maxLength={160}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Page description (max 160 chars)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/160 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Keywords</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => handleChange("keywords", e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Canonical URL
              </label>
              <input
                type="text"
                value={formData.canonicalUrl}
                onChange={(e) => handleChange("canonicalUrl", e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="https://example.com/canonical-url"
              />
            </div>
          </div>

          {/* SEO & Social Media */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">SEO & Social Media</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Priority
                </label>
                <input
                  title="priority"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.priority}
                  onChange={(e) =>
                    handleChange("priority", parseFloat(e.target.value))
                  }
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Change Frequency
                </label>
                <select
                  title="changeFrequency"
                  value={formData.changeFrequency}
                  onChange={(e) =>
                    handleChange("changeFrequency", e.target.value)
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="always">Always</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Robots Directive
              </label>
              <select
                title="robots"
                value={formData.robots}
                onChange={(e) => handleChange("robots", e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="index, follow">Index, Follow</option>
                <option value="noindex, follow">Noindex, Follow</option>
                <option value="index, nofollow">Index, Nofollow</option>
                <option value="noindex, nofollow">Noindex, Nofollow</option>
              </select>
            </div>

            {/* Open Graph */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Open Graph</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    OG Title
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={formData.ogTitle}
                    onChange={(e) => handleChange("ogTitle", e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Open Graph Title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    OG Description
                  </label>
                  <textarea
                    maxLength={160}
                    value={formData.ogDescription}
                    onChange={(e) =>
                      handleChange("ogDescription", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    rows={2}
                    placeholder="Open Graph Description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    OG Image
                  </label>
                  <input
                    type="text"
                    value={formData.ogImage}
                    onChange={(e) => handleChange("ogImage", e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    OG Type
                  </label>
                  <select
                    title="ogType"
                    value={formData.ogType}
                    onChange={(e) => handleChange("ogType", e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="website">Website</option>
                    <option value="article">Article</option>
                    <option value="product">Product</option>
                    <option value="profile">Profile</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Twitter Card */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Twitter Card</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Twitter Card Type
                  </label>
                  <select
                    title="twitterCard"
                    value={formData.twitterCard}
                    onChange={(e) =>
                      handleChange("twitterCard", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="summary">Summary</option>
                    <option value="summary_large_image">
                      Summary Large Image
                    </option>
                    <option value="app">App</option>
                    <option value="player">Player</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Twitter Title
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={formData.twitterTitle}
                    onChange={(e) =>
                      handleChange("twitterTitle", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    placeholder="Twitter Title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Twitter Description
                  </label>
                  <textarea
                    maxLength={160}
                    value={formData.twitterDescription}
                    onChange={(e) =>
                      handleChange("twitterDescription", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    rows={2}
                    placeholder="Twitter Description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Twitter Image
                  </label>
                  <input
                    type="text"
                    value={formData.twitterImage}
                    onChange={(e) =>
                      handleChange("twitterImage", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    placeholder="https://example.com/twitter-image.jpg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="lg:col-span-2 flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => router.push("/admin/meta-tags")}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : mode === "edit" ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MetaTagForm;
