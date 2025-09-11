// components/category/CategoryList.tsx
import React from "react";
import { Category as Cat } from "@/constant/types";

interface CategoryListProps {
  categories: Cat[];
  title: string;
  emptyMessage?: string;
  onCategoryClick?: (id: string) => void;
  onEditCategory?: (category: Cat) => void;
  onDeleteCategory?: (id: string) => void;
  selectedCategoryId?: string | null;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  title,
  emptyMessage = "No categories found",
  onCategoryClick,
  onEditCategory,
  onDeleteCategory,
  selectedCategoryId,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
      <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-100">{title}</h3>
      <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto scrollbar-thin">
        {categories.length === 0 ? (
          <li className="p-3 text-center text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </li>
        ) : (
          categories.map((cat) => (
            <li
              key={cat._id}
              className={`flex justify-between items-center p-3 rounded-lg transition ${
                selectedCategoryId === cat._id
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span
                onClick={() => onCategoryClick?.(cat._id as string)}
                className="flex-1 cursor-pointer font-medium hover:text-blue-600 dark:hover:text-blue-400"
              >
                {cat.name}
              </span>
              {(onEditCategory || onDeleteCategory) && (
                <div className="flex gap-2">
                  {onEditCategory && (
                    <button
                      onClick={() => onEditCategory(cat)}
                      className="px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Edit category"
                    >
                      Edit
                    </button>
                  )}
                  {onDeleteCategory && (
                    <button
                      onClick={() => onDeleteCategory(cat._id as string)}
                      className="px-2 py-1 border rounded text-red-600 hover:bg-red-50 dark:hover:bg-gray-600"
                      title="Delete category"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default CategoryList;