"use client";

import {
  createHeroContent,
  updateHeroContent,
  deleteHeroImage,
} from "@/app/actions/content_management";
import { deleteS3Object } from "@/app/actions/s3";
import FilesUploader from "@/components/FilesUploader";
import Spinner from "@/components/Spinner";
import { useFileUploader } from "@/hooks/useFileUploader";
import React, { useState, useEffect } from "react";

interface TrustBadge {
  icon: string;
  title: string;
  description?: string;
  popupText?: string;
  link?: string;
}

interface HeroData {
  _id?: string;
  title: string;
  description: string;
  imageUrl: string;
  cta_text: string;
  cta_link: string;
  trustBadges?: TrustBadge[];
}

interface HeroFormProps {
  mode: "create" | "update";
  initialData?: HeroData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Preset icon options — these map cleanly to lucide-react / heroicons names.
const ICON_OPTIONS = [
  { value: "shield-check", label: "Shield — Secure Payment" },
  { value: "truck", label: "Truck — Fast Shipping" },
  { value: "headset", label: "Headset — Support" },
  { value: "lock", label: "Lock — Secure" },
  { value: "refresh-cw", label: "Refresh — Returns" },
  { value: "credit-card", label: "Card — Payment" },
  { value: "clock", label: "Clock — Fast Delivery" },
  { value: "award", label: "Award — Quality" },
  { value: "star", label: "Star — Rating" },
  { value: "phone", label: "Phone — Contact" },
  { value: "package", label: "Package — Free Shipping" },
  { value: "badge-check", label: "Badge — Verified" },
];

// Accepts an absolute URL (http/https/ftp) or an internal path (/...).
const isValidLink = (v: string) =>
  /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v) || v.startsWith("/");

const HeroForm: React.FC<HeroFormProps> = ({
  mode,
  initialData,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    cta_text: initialData?.cta_text || "",
    cta_link: initialData?.cta_link || "",
    trustBadges: (initialData?.trustBadges ?? []) as TrustBadge[],
  });

  const { files, loading, progressByName, addFiles, setFiles } =
    useFileUploader(
      undefined,
      initialData?.imageUrl ? [initialData.imageUrl] : [],
    );

  const [submitStatus, setSubmitStatus] = useState({
    success: false,
    message: "",
    loading: false,
  });

  // Sync text fields when a different record is loaded (keyed on _id).
  useEffect(() => {
    setFormData({
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      cta_text: initialData?.cta_text ?? "",
      cta_link: initialData?.cta_link ?? "",
      trustBadges: initialData?.trustBadges ?? [],
    });
  }, [initialData?._id]);

  // Auto-dismiss status messages
  useEffect(() => {
    if (submitStatus.message) {
      const timer = setTimeout(() => {
        setSubmitStatus({ success: false, message: "", loading: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus.message]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- Trust badge handlers ----------
  const addBadge = () => {
    setFormData((prev) => ({
      ...prev,
      trustBadges: [
        ...prev.trustBadges,
        {
          icon: "shield-check",
          title: "",
          description: "",
          popupText: "",
          link: "",
        },
      ],
    }));
  };

  const updateBadge = (
    index: number,
    field: keyof TrustBadge,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      trustBadges: prev.trustBadges.map((badge, i) =>
        i === index ? { ...badge, [field]: value } : badge,
      ),
    }));
  };

  const removeBadge = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      trustBadges: prev.trustBadges.filter((_, i) => i !== index),
    }));
  };

  // Handle image removal – deletes the exact file the user clicked
  const handleRemoveImage = async (index: number, fileUrl: string) => {
    try {
      if (mode === "update" && initialData?._id) {
        const result = await deleteHeroImage(initialData._id, fileUrl);
        if (!result.success) {
          throw new Error(result.error || "Failed to remove image");
        }
      } else {
        await deleteS3Object(fileUrl);
      }

      setFiles((prev) => prev.filter((_, i) => i !== index));

      setSubmitStatus({
        success: true,
        message: "Image removed successfully",
        loading: false,
      });
      setTimeout(
        () => setSubmitStatus({ success: false, message: "", loading: false }),
        3000,
      );
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: (error as Error).message || "Failed to remove image",
        loading: false,
      });
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setSubmitStatus({
        success: false,
        message: "Please upload at least one image",
        loading: false,
      });
      return;
    }

    if (
      !formData.title ||
      !formData.description ||
      !formData.cta_text ||
      !formData.cta_link
    ) {
      setSubmitStatus({
        success: false,
        message: "Please fill in all required fields",
        loading: false,
      });
      return;
    }

    // Validate badges: each must have icon + title
    const invalidBadge = formData.trustBadges.find(
      (b) => !b.icon || !b.title.trim(),
    );
    if (invalidBadge) {
      setSubmitStatus({
        success: false,
        message: "Each trust badge needs an icon and a title",
        loading: false,
      });
      return;
    }

    // Validate optional badge links
    const invalidLinkBadge = formData.trustBadges.find(
      (b) => b.link && b.link.trim() && !isValidLink(b.link.trim()),
    );
    if (invalidLinkBadge) {
      setSubmitStatus({
        success: false,
        message: `Badge "${
          invalidLinkBadge.title || "unnamed"
        }": link must be a valid URL or start with /`,
        loading: false,
      });
      return;
    }

    setSubmitStatus({ success: false, message: "", loading: true });

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("cta_text", formData.cta_text);
    data.append("cta_link", formData.cta_link);
    data.append("imageUrl", files[0]);
    data.append("trustBadges", JSON.stringify(formData.trustBadges));

    try {
      let result;
      if (mode === "create") {
        result = await createHeroContent(null, data);
      } else {
        if (!initialData?._id) {
          setSubmitStatus({
            success: false,
            message: "ID is required for update",
            loading: false,
          });
          return;
        }
        result = await updateHeroContent(initialData._id, null, data);
      }

      setSubmitStatus({
        success: result.success,
        message: result.message || "",
        loading: false,
      });

      if (result.success) {
        if (mode === "create") {
          setFormData({
            title: "",
            description: "",
            cta_text: "",
            cta_link: "",
            trustBadges: [],
          });
          setFiles([]);
        }
        onSuccess?.();
      }
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: "An error occurred while submitting",
        loading: false,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          {mode === "create" ? "Add Hero Content" : "Edit Hero Content"}
        </h2>
        <p className="text-gray-600">
          {mode === "create"
            ? "Create a new hero section for your website"
            : "Update the hero section content"}
        </p>
      </div>

      {submitStatus.message && (
        <div
          className={`p-4 mb-6 rounded-md ${
            submitStatus.success
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-red-100 text-red-700 border border-red-200"
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      <div className="mb-8">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Hero Images
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Add images for your hero section. You can upload multiple images for
            a carousel.
          </p>
        </div>
        <FilesUploader
          files={files}
          loading={loading}
          progressByName={progressByName}
          addFiles={addFiles}
          onRemove={handleRemoveImage}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title *
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="cta_text"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              CTA Text *
            </label>
            <input
              id="cta_text"
              type="text"
              name="cta_text"
              value={formData.cta_text}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="cta_link"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            CTA Link *
          </label>
          <input
            id="cta_link"
            type="url"
            name="cta_link"
            value={formData.cta_link}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com"
            required
          />
        </div>

        {/* ---------- Trust Badges Section ---------- */}
        <div className="border-t pt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Trust Badges
            </h3>
            <p className="text-sm text-gray-500">
              Optional badges displayed in the hero section (e.g. Secure
              Payment, Fast Shipping, 24/7 Support). Icon names map to
              lucide-react / heroicons identifiers.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              <strong>Popup Text</strong> makes the badge open a dialog. If{" "}
              <strong>Link</strong> is also set, it appears inside that dialog.
              With only a <strong>Link</strong>, the badge navigates directly.
            </p>
          </div>

          {formData.trustBadges.length === 0 ? (
            <p className="text-sm text-gray-400 italic mb-3">
              No trust badges added yet.
            </p>
          ) : (
            <div className="space-y-4 mb-3">
              {formData.trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-md border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Badge {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBadge(index)}
                      className="text-sm text-red-600 hover:text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Row 1 — primary fields */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Icon *
                      </label>
                      <select
                        value={badge.icon}
                        onChange={(e) =>
                          updateBadge(index, "icon", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={badge.title}
                        onChange={(e) =>
                          updateBadge(index, "title", e.target.value)
                        }
                        placeholder="Secure Payment"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={badge.description ?? ""}
                        onChange={(e) =>
                          updateBadge(index, "description", e.target.value)
                        }
                        placeholder="SSL encrypted checkout"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Row 2 — interaction fields */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                    <div className="md:col-span-7">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Popup Text
                      </label>
                      <textarea
                        rows={2}
                        value={badge.popupText ?? ""}
                        onChange={(e) =>
                          updateBadge(index, "popupText", e.target.value)
                        }
                        placeholder="We accept all major credit cards. Payments are encrypted with 256-bit SSL."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Link
                      </label>
                      <input
                        type="text"
                        value={badge.link ?? ""}
                        onChange={(e) =>
                          updateBadge(index, "link", e.target.value)
                        }
                        placeholder="https://example.com or /return-policy"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Absolute URL or internal path. Opens in new tab if
                        external.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addBadge}
            className="px-4 py-2 text-sm border border-dashed border-gray-400 text-gray-700 rounded-md hover:bg-gray-50"
          >
            + Add Trust Badge
          </button>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitStatus.loading}
            className="flex items-center justify-center px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitStatus.loading ? (
              <>
                <Spinner />
                {mode === "create" ? "Creating..." : "Updating..."}
              </>
            ) : mode === "create" ? (
              "Create Hero Content"
            ) : (
              "Update Hero Content"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HeroForm;
