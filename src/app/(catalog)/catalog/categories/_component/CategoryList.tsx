// components/category/CategoryList.tsx
import React, { useState, useMemo } from "react";
import { Category as Cat } from "@/constant/types";

// Extended interface to include subcategories
interface CategoryWithSubcategories extends Cat {
  subcategories?: Cat[];
}

interface CategoryListProps {
  categories: CategoryWithSubcategories[];
  title: string;
  emptyMessage?: string;
  onCategoryClick?: (id: string) => void;
  onEditCategory?: (category: Cat) => void;
  onDeleteCategory?: (id: string) => void;
  selectedCategoryId?: string | null;
  showFilter?: boolean;
  filterPlaceholder?: string;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  title,
  emptyMessage = "No categories found",
  onCategoryClick,
  onEditCategory,
  onDeleteCategory,
  selectedCategoryId,
  showFilter = true,
  filterPlaceholder = "Filter categories...",
}) => {
  const [filter, setFilter] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Filter categories based on search input
  const filteredCategories = useMemo(() => {
    if (!filter.trim()) return categories;

    const searchTerm = filter.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(searchTerm) ||
        cat.description?.toLowerCase().includes(searchTerm) ||
        cat.seo_title?.toLowerCase().includes(searchTerm) ||
        cat.keywords?.toLowerCase().includes(searchTerm)
    );
  }, [categories, filter]);

  const handleClearFilter = () => {
    setFilter("");
  };

  const toggleExpandCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Format date for display
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (status === "active") {
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
    }
    return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-2 lg:mb-0">
          {title}
        </h3>

        <div className="flex items-center gap-4">
          {filteredCategories.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredCategories.length} of {categories.length}
            </span>
          )}

          {/* Filter Input */}
          {showFilter && categories.length > 0 && (
            <div className="relative w-full lg:w-64">
              <input
                type="text"
                placeholder={filterPlaceholder}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full p-2 pl-3 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {filter && (
                <button
                  onClick={handleClearFilter}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {filter.trim() ? "No categories match your search" : emptyMessage}
          {filter.trim() && (
            <button
              onClick={handleClearFilter}
              className="ml-1 text-blue-500 hover:text-blue-600 underline"
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                  Name & Description
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                  Subcategories
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300 hidden md:table-cell">
                  Status
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                  Sort Order
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300 hidden xl:table-cell">
                  SEO
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300 hidden 2xl:table-cell">
                  Created
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => {
                const hasSubcategories =
                  cat.subcategories && cat.subcategories.length > 0;
                const isExpanded = expandedCategories.has(cat._id as string);

                return (
                  <React.Fragment key={cat._id}>
                    {/* Main Category Row */}
                    <tr
                      className={`border-b border-gray-100 dark:border-gray-800 transition ${
                        selectedCategoryId === cat._id
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      {/* Name & Description Column */}
                      <td className="py-3 px-2">
                        <div className="group">
                          <div
                            className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer"
                            onClick={() => onCategoryClick?.(cat._id as string)}
                          >
                            {cat.name}
                          </div>
                          {cat.description && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                              {cat.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Slug: {cat.url_slug}
                          </div>
                          {/* Mobile-only status badge */}
                          <div className="md:hidden mt-2">
                            <span className={getStatusBadge(cat.status || "")}>
                              {cat.status}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Subcategories Column */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {hasSubcategories ? (
                            <>
                              <button
                                onClick={() =>
                                  toggleExpandCategory(cat?._id as string)
                                }
                                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                <span
                                  className={`transform transition-transform ${
                                    isExpanded ? "rotate-90" : ""
                                  }`}
                                >
                                  ▶
                                </span>
                                <span>
                                  {cat.subcategories!.length} subcategories
                                </span>
                              </button>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-2 hidden md:table-cell">
                        <span className={getStatusBadge(cat.status || "")}>
                          {cat.status}
                        </span>
                      </td>

                      {/* Sort Order Column */}
                      <td className="py-3 px-2 hidden lg:table-cell">
                        <span className="text-gray-700 dark:text-gray-300 font-mono">
                          {cat.sort_order || 0}
                        </span>
                      </td>

                      {/* SEO Column */}
                      <td className="py-3 px-2 hidden xl:table-cell">
                        <div className="space-y-1">
                          {cat.seo_title && (
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                              {cat.seo_title}
                            </div>
                          )}
                          {cat.seo_desc && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {cat.seo_desc}
                            </div>
                          )}
                          {cat.keywords && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                              {cat.keywords}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Created Date Column */}
                      <td className="py-3 px-2 hidden 2xl:table-cell">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(cat.created_at)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Updated: {formatDate(cat.updated_at)}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          {onEditCategory && (
                            <button
                              onClick={() => onEditCategory(cat)}
                              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Edit category"
                            >
                              Edit
                            </button>
                          )}
                          {onDeleteCategory && (
                            <button
                              onClick={() =>
                                onDeleteCategory(cat._id as string)
                              }
                              className="px-3 py-1 text-sm border border-red-300 dark:border-red-700 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete category"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Subcategories Rows */}
                    {isExpanded && hasSubcategories && (
                      <>
                        {cat.subcategories!.map((subcat) => (
                          <tr
                            key={subcat._id}
                            className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
                          >
                            <td className="py-2 px-2 pl-8">
                              <div className="flex items-center">
                                <span className="text-gray-400 mr-2">↳</span>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300">
                                    {subcat.name}
                                  </div>
                                  {subcat.description && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {subcat.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <span className="text-sm text-gray-400">
                                Subcategory
                              </span>
                            </td>
                            <td className="py-2 px-2 hidden md:table-cell">
                              <span className={getStatusBadge(subcat.status || "")}>
                                {subcat.status}
                              </span>
                            </td>
                            <td className="py-2 px-2 hidden lg:table-cell">
                              <span className="text-gray-700 dark:text-gray-300 font-mono">
                                {subcat.sort_order || 0}
                              </span>
                            </td>
                            <td className="py-2 px-2 hidden xl:table-cell"></td>
                            <td className="py-2 px-2 hidden 2xl:table-cell"></td>
                            <td className="py-2 px-2">
                              <div className="flex gap-2">
                                {onEditCategory && (
                                  <button
                                    onClick={() => onEditCategory(subcat)}
                                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                                {onDeleteCategory && (
                                  <button
                                    onClick={() =>
                                      onDeleteCategory(subcat._id as string)
                                    }
                                    className="px-2 py-1 text-xs border border-red-300 dark:border-red-700 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CategoryList;
