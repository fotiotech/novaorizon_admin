"use client";

import { useTransition } from "react";
import { useFormState } from "react-dom"; // <-- useFormState from react-dom
import { createPage, updatePage } from "@/app/actions/page";

type ActionState = {
  errors?: Record<string, string[]>;
  success?: boolean;
};

const initialState: ActionState = { errors: {} };

interface PageFormProps {
  initialData?: any;
}

export default function PageForm({ initialData }: PageFormProps) {
  const isEditing = !!initialData;
  const action = isEditing
    ? updatePage.bind(null, initialData._id)
    : createPage;

  // Use useFormState (React 18) instead of useActionState
  const [state, formAction] = useFormState<ActionState, FormData>(
    action as any,
    initialState,
  );

  // Use useTransition to get a pending flag
  const [isPending, startTransition] = useTransition();

  // Wrap formAction in a transition to show pending state
  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form
      action={handleSubmit}
      className="max-w-3xl mx-auto p-6 bg-white shadow rounded"
    >
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? "Edit Page" : "Create New Page"}
      </h1>

      {/* All form fields remain exactly the same as before */}
      {/* Title */}
      <div className="mb-4">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={initialData?.title || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          required
        />
        {state.errors?.title && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.title.join(", ")}
          </p>
        )}
      </div>

      {/* Slug */}
      <div className="mb-4">
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-gray-700"
        >
          Slug (leave blank to auto-generate)
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          defaultValue={initialData?.slug || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
        {state.errors?.slug && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.slug.join(", ")}
          </p>
        )}
      </div>

      {/* Excerpt */}
      <div className="mb-4">
        <label
          htmlFor="excerpt"
          className="block text-sm font-medium text-gray-700"
        >
          Excerpt (max 300 chars)
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={300}
          defaultValue={initialData?.excerpt || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
        {state.errors?.excerpt && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.excerpt.join(", ")}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700"
        >
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={10}
          defaultValue={initialData?.content || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      {/* Featured Image */}
      <div className="mb-4">
        <label
          htmlFor="featuredImage"
          className="block text-sm font-medium text-gray-700"
        >
          Featured Image URL
        </label>
        <input
          type="url"
          id="featuredImage"
          name="featuredImage"
          defaultValue={initialData?.featuredImage || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
        {state.errors?.featuredImage && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.featuredImage.join(", ")}
          </p>
        )}
      </div>

      {/* Meta Title */}
      <div className="mb-4">
        <label
          htmlFor="metaTitle"
          className="block text-sm font-medium text-gray-700"
        >
          Meta Title (max 60 chars)
        </label>
        <input
          type="text"
          id="metaTitle"
          name="metaTitle"
          maxLength={60}
          defaultValue={initialData?.metaTitle || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
        {state.errors?.metaTitle && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.metaTitle.join(", ")}
          </p>
        )}
      </div>

      {/* Meta Description */}
      <div className="mb-4">
        <label
          htmlFor="metaDescription"
          className="block text-sm font-medium text-gray-700"
        >
          Meta Description (max 160 chars)
        </label>
        <textarea
          id="metaDescription"
          name="metaDescription"
          rows={2}
          maxLength={160}
          defaultValue={initialData?.metaDescription || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
        {state.errors?.metaDescription && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.metaDescription.join(", ")}
          </p>
        )}
      </div>

      {/* Meta Keywords */}
      <div className="mb-4">
        <label
          htmlFor="metaKeywords"
          className="block text-sm font-medium text-gray-700"
        >
          Meta Keywords (comma separated)
        </label>
        <input
          type="text"
          id="metaKeywords"
          name="metaKeywords"
          defaultValue={initialData?.metaKeywords?.join(", ") || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          placeholder="keyword1, keyword2"
        />
        {state.errors?.metaKeywords && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.metaKeywords.join(", ")}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label
          htmlFor="tags"
          className="block text-sm font-medium text-gray-700"
        >
          Tags (comma separated)
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          defaultValue={initialData?.tags?.join(", ") || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          placeholder="tag1, tag2"
        />
        {state.errors?.tags && (
          <p className="text-red-500 text-sm mt-1">
            {state.errors.tags.join(", ")}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="mb-4">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700"
        >
          Category
        </label>
        <input
          type="text"
          id="category"
          name="category"
          defaultValue={initialData?.category || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      {/* Status */}
      <div className="mb-4">
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initialData?.status || "draft"}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        >
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Published At */}
      <div className="mb-4">
        <label
          htmlFor="publishedAt"
          className="block text-sm font-medium text-gray-700"
        >
          Published At
        </label>
        <input
          type="datetime-local"
          id="publishedAt"
          name="publishedAt"
          defaultValue={
            initialData?.publishedAt
              ? new Date(initialData.publishedAt).toISOString().slice(0, 16)
              : ""
          }
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      {/* Is Featured */}
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="isFeatured"
          name="isFeatured"
          value="true"
          defaultChecked={!!initialData?.isFeatured}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <label
          htmlFor="isFeatured"
          className="ml-2 block text-sm text-gray-700"
        >
          Featured Page
        </label>
      </div>

      {/* Form-level error */}
      {state.errors?._form && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {state.errors._form.join(", ")}
        </div>
      )}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
