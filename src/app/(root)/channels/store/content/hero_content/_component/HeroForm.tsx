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

interface HeroData {
  _id?: string;
  title: string;
  description: string;
  imageUrl: string;
  cta_text: string;
  cta_link: string;
}

interface HeroFormProps {
  mode: "create" | "update";
  initialData?: HeroData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

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
  });

  // useFileUploader – now without database callback
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

  // Sync *text* fields when a different record is loaded.
  // Keyed on _id (not object identity) so a parent re-render doesn't clobber
  // local edits. Note: we do NOT touch `files` here — useFileUploader already
  // owns that state and syncing it here caused deleted images to reappear.
  useEffect(() => {
    setFormData({
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      cta_text: initialData?.cta_text ?? "",
      cta_link: initialData?.cta_link ?? "",
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

  // Handle image removal – deletes the exact file the user clicked
  const handleRemoveImage = async (index: number, fileUrl: string) => {
    try {
      if (mode === "update" && initialData?._id) {
        const result = await deleteHeroImage(initialData._id, fileUrl);
        if (!result.success) {
          throw new Error(result.error || "Failed to remove image");
        }
      } else {
        // Create mode: file is already in S3, so remove it there too.
        await deleteS3Object(fileUrl);
      }

      // Remove from local state (source of truth for the uploader)
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
      // Re-throw so FilesUploader's built-in alert also fires
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

    setSubmitStatus({ success: false, message: "", loading: true });

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("cta_text", formData.cta_text);
    data.append("cta_link", formData.cta_link);
    data.append("imageUrl", files[0]);

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
            className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
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
