"use client";

import React, { useState, useMemo } from "react";
import {
  Edit,
  Delete,
  Search,
  SearchOff,
  FolderOpen,
  KeyboardArrowRight,
  MoreVert,
  SubdirectoryArrowRight,
} from "@mui/icons-material";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";

interface CategoryNode {
  _id: string;
  name: string;
  url_slug?: string;
  description?: string;
  parent_id?: string | null;
  parentId?: string | null;
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
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  hideFilter?: boolean;
}

type FlatRow = CategoryNode & {
  level: number;
  visible: boolean;
  parentName: string | null;
};

const getParentId = (node: CategoryNode): string | null => {
  const pid = node.parentId ?? node.parent_id ?? null;
  return pid ? String(pid) : null;
};

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  title = "Categories",
  emptyMessage = "No categories found",
  onEditCategory,
  onDeleteCategory,
  showFilter = true,
  filterPlaceholder = "Search categories…",
  filterValue,
  onFilterChange,
  hideFilter = false,
}) => {
  const [internalFilter, setInternalFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isFilterControlled = filterValue !== undefined;
  const filter = isFilterControlled ? filterValue! : internalFilter;
  const setFilter = isFilterControlled
    ? (onFilterChange ?? (() => {}))
    : setInternalFilter;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flat lookup of every known category, keyed by _id. Used ONLY to
  // resolve a row's parent name — never to rebuild the tree.
  const nodesById = useMemo(() => {
    const map = new Map<string, CategoryNode>();
    const walk = (nodes: CategoryNode[] | undefined) => {
      if (!nodes) return;
      for (const n of nodes) {
        if (!n || !n._id) continue;
        if (!map.has(n._id)) map.set(n._id, n);
        walk(n.subcategories);
      }
    };
    walk(categories);
    return map;
  }, [categories]);

  const resolveParentName = (node: CategoryNode): string | null => {
    const pid = getParentId(node);
    if (!pid) return null;
    const parent = nodesById.get(pid);
    return parent ? parent.name : null;
  };

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
          return { ...node, subcategories: filteredChildren };
        }
        return null;
      })
      .filter(Boolean) as CategoryNode[];
  };

  const filteredCategories = useMemo(
    () => filterTree(categories, filter),
    [categories, filter],
  );

  const flattenTree = (
    nodes: CategoryNode[],
    level: number = 0,
    parentExpanded: boolean = true,
    visited = new Set<string>(),
  ): FlatRow[] => {
    let rows: FlatRow[] = [];
    for (const node of nodes) {
      if (!node?._id || visited.has(node._id)) continue;
      visited.add(node._id);
      const isExpanded = expanded.has(node._id);
      const visible = parentExpanded;
      rows.push({
        ...node,
        level,
        visible,
        parentName: resolveParentName(node),
      });
      if (node.subcategories && node.subcategories.length > 0 && isExpanded) {
        rows = rows.concat(
          flattenTree(node.subcategories, level + 1, true, visited),
        );
      }
    }
    return rows;
  };

  const flattenedRows = useMemo<FlatRow[]>(
    () => flattenTree(filteredCategories, 0, true),
    [filteredCategories, expanded, nodesById],
  );

  const getMenuItems = (row: CategoryNode): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit category",
      icon: <Edit fontSize="small" />,
      onClick: () => onEditCategory(row),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => onDeleteCategory(row),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {flattenedRows.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {filteredCategories.length}
            </span>
          )}
        </div>
      </div>

      {showFilter && !hideFilter && (
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search
              fontSize="small"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder={filterPlaceholder}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      )}

      {flattenedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {filter.trim() ? (
              <SearchOff className="text-muted-foreground" />
            ) : (
              <FolderOpen className="text-muted-foreground" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {filter.trim()
              ? "No categories match your search"
              : "No categories yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter.trim()
              ? "Try adjusting or clearing your search."
              : emptyMessage}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Parent
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flattenedRows.map((row) => {
                const hasChildren =
                  row.subcategories && row.subcategories.length > 0;
                const isExpanded = expanded.has(row._id);

                return (
                  <tr
                    key={row._id}
                    className={`group transition-colors hover:bg-muted/40 ${
                      row.visible ? "" : "hidden"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${row.level * 1.25}rem` }}
                      >
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(row._id)}
                            className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                            aria-expanded={isExpanded}
                          >
                            <KeyboardArrowRight
                              fontSize="small"
                              className={`transition-transform duration-200 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="inline-flex h-6 w-6 flex-none items-center justify-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-border" />
                          </span>
                        )}

                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <FolderOpen fontSize="small" />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {row.name}
                          </div>
                          {row.url_slug && (
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {row.url_slug}
                            </div>
                          )}
                        </div>

                        {hasChildren && (
                          <span className="ml-2 inline-flex flex-none items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {row.subcategories.length}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      {row.parentName ? (
                        <span className="inline-flex max-w-[16rem] items-center gap-1.5 text-muted-foreground">
                          <SubdirectoryArrowRight
                            fontSize="small"
                            className="flex-none text-muted-foreground/70"
                          />
                          <span className="truncate" title={row.parentName}>
                            {row.parentName}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/60">
                          — root —
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end">
                        <PopoverMenu
                          items={getMenuItems(row)}
                          ariaLabel={`Actions for ${row.name}`}
                          trigger={<MoreVert fontSize="small" />}
                          align="right"
                        />
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
