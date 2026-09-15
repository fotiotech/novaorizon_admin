"use client";

import React, { useState, useMemo } from "react";

interface CategoryNode {
  _id: string;
  name: string;
  url_slug?: string;
  description?: string;
  parent_id?: string | null;
  imageUrl?: string[];
  subcategories: CategoryNode[];
}

interface CategoryListProps {
  categories: CategoryNode[];
  title?: string;
  emptyMessage?: string;
  onEditCategory: (category: CategoryNode) => void;
  onDeleteCategory: (category: CategoryNode) => void;
  showFilter?: boolean;
  filterPlaceholder?: string;

  /**
   * Optional controlled filter. When provided, CategoryList no longer
   * maintains its own filter state — the parent owns it. This lets the
   * same value drive the desktop inline input AND a mobile bottom-sheet
   * input without duplicating state.
   */
  filterValue?: string;
  onFilterChange?: (value: string) => void;

  /**
   * When true, the built-in filter input is not rendered. The parent is
   * expected to render its own (e.g. in a mobile bottom sheet). Filtering
   * still works via `filterValue` / `onFilterChange`.
   */
  hideFilter?: boolean;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  title = "Categories",
  emptyMessage = "No categories found",
  onEditCategory,
  onDeleteCategory,
  showFilter = true,
  filterPlaceholder = "Search categories...",
  filterValue,
  onFilterChange,
  hideFilter = false,
}) => {
  const [internalFilter, setInternalFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Controlled vs uncontrolled filter
  const isFilterControlled = filterValue !== undefined;
  const filter = isFilterControlled ? filterValue! : internalFilter;
  const setFilter = isFilterControlled
    ? (onFilterChange ?? (() => {}))
    : setInternalFilter;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Recursive filter by name (case-insensitive)
  const filterTree = (
    nodes: CategoryNode[],
    query: string,
    visited = new Set<string>(),
  ): CategoryNode[] => {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase();
    return nodes
      ?.map((node) => {
        if (visited.has(node._id)) return null;
        visited.add(node._id);
        const matches = node.name.toLowerCase().includes(lower);
        const filteredChildren = filterTree(
          node.subcategories || [],
          query,
          visited,
        );
        if (matches || filteredChildren?.length > 0) {
          return {
            ...node,
            subcategories: filteredChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as CategoryNode[];
  };

  const filteredCategories = useMemo(
    () => filterTree(categories, filter),
    [categories, filter],
  );

  // Flatten tree into rows with level and visibility info
  const flattenTree = (
    nodes: CategoryNode[],
    level: number = 0,
    parentExpanded: boolean = true,
    visited = new Set<string>(),
  ): Array<CategoryNode & { level: number; visible: boolean }> => {
    let rows: Array<CategoryNode & { level: number; visible: boolean }> = [];
    for (const node of nodes) {
      if (!node?._id || visited.has(node._id)) continue;
      visited.add(node._id);
      const isExpanded = expanded.has(node._id);
      const visible = parentExpanded;
      rows.push({ ...node, level, visible });
      if (node.subcategories && node.subcategories.length > 0 && isExpanded) {
        rows = rows.concat(
          flattenTree(node.subcategories, level + 1, true, visited),
        );
      }
    }
    return rows;
  };

  const flattenedRows = useMemo(
    () => flattenTree(filteredCategories, 0, true),
    [filteredCategories, expanded],
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl space-y-4">
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}

      {showFilter && !hideFilter && (
        <div className="relative">
          <input
            type="text"
            placeholder={filterPlaceholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full p-2 pl-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      )}

      {flattenedRows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
              <tr>
                <th scope="col" className="px-4 py-3 min-w-[200px]">
                  Category
                </th>

                <th scope="col" className="px-4 py-3 text-right w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {flattenedRows.map((row) => {
                const hasChildren =
                  row.subcategories && row.subcategories.length > 0;
                const isExpanded = expanded.has(row._id);

                return (
                  <tr
                    key={row._id}
                    className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                      row.visible ? "" : "hidden"
                    }`}
                  >
                    <td
                      className="px-4 py-2"
                      style={{ paddingLeft: `${row.level * 1.5 + 1}rem` }}
                    >
                      <div className="flex items-start gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {row.name}
                          </div>
                          {row.url_slug && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 break-all">
                              {row.url_slug}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEditCategory(row)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition"
                          aria-label={`Edit ${row.name}`}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => onDeleteCategory(row)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition"
                          aria-label={`Delete ${row.name}`}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
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
