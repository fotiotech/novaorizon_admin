// components/category/CategoryForm.tsx
"use client";

import React, { ChangeEvent, FormEvent, useCallback } from "react";
import FilesUploader from "@/components/FilesUploader";
import { Category as Cat } from "@/constant/types";
import { useFileUploader } from "@/hooks/useFileUploader";

interface CategoryFormProps {
  categoryData: Cat;
  categories: Cat[];
  editId: string | null;
  loading: boolean;
  files: any[];
  onDataChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAddFiles: (files: any[]) => void;
  onRemoveFile: (file: any) => void;
  onSubmit: (e: FormEvent) => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  categoryData,
  categories,
  editId,
  loading,
  files,
  onDataChange,
  onAddFiles,
  onRemoveFile,
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 bg-white dark:bg-gray-800 shadow rounded-xl p-4"
    >
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="parent_id" className="block mb-1 font-medium">
            Parent Category
          </label>
          <select
          title="p cat"
            name="parent_id"
            value={categoryData.parent_id}
            onChange={onDataChange}
            className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select Parent Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="name" className="block mb-1 font-medium">
            Category Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={categoryData.name}
            onChange={onDataChange}
            className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <FilesUploader
          files={files}
          loading={loading}
          addFiles={onAddFiles}
          removeFile={onRemoveFile as any}
        />
      </div>

      <div>
        <label htmlFor="description" className="block mb-1 font-medium">
          Description
        </label>
        <input
          id="description"
          type="text"
          name="description"
          value={categoryData.description}
          onChange={onDataChange}
          className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {editId ? "Update Category" : "Add Category"}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;