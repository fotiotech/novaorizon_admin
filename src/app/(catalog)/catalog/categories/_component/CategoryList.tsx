// app/catalog/categories/_component/CategoryList.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Edit,
  Delete,
  Search,
  SearchOff,
  FolderOpen,
  KeyboardArrowRight,
  MoreVert,
  SubdirectoryArrowRight,
  AccountTree,
  Visibility,
  Add,
  Inventory2,
} from "@mui/icons-material";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";

interface CategoryPropertyRef {
  _id: string;
  name: string;
  code?: string;
}

interface CategoryNode {
  _id: string;
  name: string;
  url_slug?: string;
  description?: string;
  parent_id?: string | null;
  parentId?: string | null;
  imageUrl?: string[];
  property?: CategoryPropertyRef | string | null;
  hasInheritedSnapshot?: boolean;
  inheritProperty?: boolean;
  subcategories?: CategoryNode[];
}

interface CategoryListProps {
  /** Flat list of every category. */
  categories: CategoryNode[];
  /** Direct product counts keyed by category id. */
  productCounts?: Record<string, number>;
  title?: string;
  emptyMessage?: string;
  onEditCategory: (category: CategoryNode) => void;
  onDeleteCategory: (category: CategoryNode) => void;
  onRunInheritance: (category: CategoryNode) => void;
  onViewProperty: (category: CategoryNode) => void;
  /** Opens the create form pre-filled with this category as the parent. */
  onAddChild?: (category: CategoryNode) => void;
  showFilter?: boolean;
  filterPlaceholder?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  hideFilter?: boolean;
  // ---------- View mode ----------
  browseMode?: boolean;
  browsePath?: string[];
  onOpenCategory?: (category: CategoryNode) => void;
  onBreadcrumbClick?: (index: number) => void;
}

type FlatRow = CategoryNode & {
  parentName: string | null;
};

type BreadcrumbItem = {
  id: string | null;
  name: string;
  pathIndex: number;
};

const getParentId = (node: CategoryNode): string | null => {
  const pid = node.parentId ?? node.parent_id ?? null;
  return pid ? String(pid) : null;
};

const asPropertyRef = (
  src: CategoryPropertyRef | string | null | undefined,
): CategoryPropertyRef | null => {
  if (!src) return null;
  if (typeof src === "string") return null;
  return src;
};

const isAllCategoryName = (name: string): boolean => {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  return n === "all category" || n === "all categories";
};

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  productCounts = {},
  title = "Categories",
  emptyMessage = "No categories found",
  onEditCategory,
  onDeleteCategory,
  onRunInheritance,
  onViewProperty,
  onAddChild,
  showFilter = true,
  filterPlaceholder = "Search categories…",
  filterValue,
  onFilterChange,
  hideFilter = false,
  browseMode = true,
  browsePath = [],
  onOpenCategory,
  onBreadcrumbClick,
}) => {
  const [internalFilter, setInternalFilter] = useState("");

  const isFilterControlled = filterValue !== undefined;
  const filter = isFilterControlled ? filterValue! : internalFilter;
  const setFilter = isFilterControlled
    ? (onFilterChange ?? (() => {}))
    : setInternalFilter;

  const isSearching = filter.trim().length > 0;

  // -------------------------------------------------------------------
  //  Lookups
  // -------------------------------------------------------------------
  const nodesById = useMemo(() => {
    const map = new Map<string, CategoryNode>();
    for (const n of categories) {
      if (n && n._id && !map.has(n._id)) map.set(n._id, n);
    }
    return map;
  }, [categories]);

  const allNodesList = useMemo(
    () => Array.from(nodesById.values()),
    [nodesById],
  );

  const rootCategories = useMemo(
    () => allNodesList.filter((n) => !getParentId(n)),
    [allNodesList],
  );

  // -------------------------------------------------------------------
  //  Synthetic-root detection.
  // -------------------------------------------------------------------
  const syntheticRootIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rootCategories) {
      if (isAllCategoryName(r.name)) ids.add(r._id);
    }
    if (rootCategories.length === 1) ids.add(rootCategories[0]._id);
    return ids;
  }, [rootCategories]);

  const childrenCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of allNodesList) {
      const pid = getParentId(n);
      if (!pid) continue;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    return counts;
  }, [allNodesList]);

  const resolveParentName = (node: CategoryNode): string | null => {
    const pid = getParentId(node);
    if (!pid) return null;
    const parent = nodesById.get(pid);
    return parent ? parent.name : null;
  };

  // -------------------------------------------------------------------
  //  Browse (drill-down) computations
  // -------------------------------------------------------------------
  const browseCurrentParentId = useMemo(
    () => (browsePath.length > 0 ? browsePath[browsePath.length - 1] : null),
    [browsePath],
  );

  const browseChildren = useMemo(() => {
    if (!browseMode) return [] as CategoryNode[];
    return allNodesList
      .filter((n) => {
        const pid = getParentId(n);
        if (browseCurrentParentId === null) return pid === null;
        return pid === browseCurrentParentId;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [browseMode, allNodesList, browseCurrentParentId]);

  // -------------------------------------------------------------------
  //  List mode
  // -------------------------------------------------------------------
  const listRows = useMemo(() => {
    return allNodesList
      .filter((n) => !syntheticRootIds.has(n._id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allNodesList, syntheticRootIds]);

  const listRowsFiltered = useMemo(() => {
    if (!isSearching) return listRows;
    const q = filter.trim().toLowerCase();
    return listRows.filter((n) => n.name.toLowerCase().includes(q));
  }, [listRows, filter, isSearching]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [] as CategoryNode[];
    const q = filter.trim().toLowerCase();
    return allNodesList
      .filter((n) => !syntheticRootIds.has(n._id))
      .filter((n) => n.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allNodesList, filter, isSearching, syntheticRootIds]);

  // -------------------------------------------------------------------
  //  Breadcrumbs — only in browse mode.
  // -------------------------------------------------------------------
  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    if (!browseMode) return [];

    const items: BreadcrumbItem[] = [];
    const firstId = browsePath[0];
    const firstNode = firstId ? nodesById.get(firstId) : undefined;
    const firstIsRoot = !!firstNode && !getParentId(firstNode);

    if (!firstIsRoot) {
      items.push({ id: null, name: "All categories", pathIndex: -1 });
    }

    browsePath.forEach((id, i) => {
      items.push({
        id,
        name: nodesById.get(id)?.name ?? "Unknown",
        pathIndex: i,
      });
    });

    return items;
  }, [browseMode, browsePath, nodesById]);

  // -------------------------------------------------------------------
  //  Rows to render
  // -------------------------------------------------------------------
  const rowsToRender: FlatRow[] = useMemo(() => {
    const toRow = (n: CategoryNode): FlatRow => ({
      ...n,
      parentName: resolveParentName(n),
    });

    if (browseMode) {
      const source = isSearching ? searchResults : browseChildren;
      return source.map(toRow);
    }
    return listRowsFiltered.map(toRow);
  }, [
    browseMode,
    isSearching,
    searchResults,
    browseChildren,
    listRowsFiltered,
    nodesById,
  ]);

  // -------------------------------------------------------------------
  //  Animation
  // -------------------------------------------------------------------
  const prevNavRef = useRef<{ mode: boolean; len: number }>({
    mode: browseMode,
    len: browsePath.length,
  });
  const [navDirection, setNavDirection] = useState<"in" | "out" | "fade">(
    "fade",
  );

  useEffect(() => {
    const prev = prevNavRef.current;
    const next = { mode: browseMode, len: browsePath.length };

    if (next.mode !== prev.mode) setNavDirection("fade");
    else if (next.len > prev.len) setNavDirection("in");
    else if (next.len < prev.len) setNavDirection("out");
    else setNavDirection("fade");

    prevNavRef.current = next;
  }, [browseMode, browsePath]);

  const animationKey = browseMode ? `browse:${browsePath.join("|")}` : "list";
  const animationClass =
    navDirection === "in"
      ? "browse-anim-in"
      : navDirection === "out"
        ? "browse-anim-out"
        : "browse-anim-fade";

  const hasChildrenById = (id: string): boolean =>
    (childrenCountById.get(id) ?? 0) > 0;

  // Parent column is only meaningful in flat list mode.
  const showParentColumn = !browseMode;

  const getMenuItems = (row: CategoryNode): PopoverMenuItem[] => {
    const items: PopoverMenuItem[] = [
      {
        key: "edit",
        label: "Edit category",
        icon: <Edit fontSize="small" />,
        onClick: () => onEditCategory(row),
      },
    ];

    if (onAddChild) {
      items.push({
        key: "add-child",
        label: "Add child category",
        icon: <Add fontSize="small" />,
        onClick: () => onAddChild(row),
      });
    }

    items.push({
      key: "view-property",
      label: "View property",
      icon: <Visibility fontSize="small" />,
      onClick: () => onViewProperty(row),
    });

    if (row.inheritProperty && getParentId(row)) {
      items.push({
        key: "run-inheritance",
        label: "Re-run inheritance",
        icon: <AccountTree fontSize="small" />,
        onClick: () => onRunInheritance(row),
      });
    }

    items.push({
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => onDeleteCategory(row),
    });

    return items;
  };

  const displayCount = rowsToRender.length;
  const headerCount = browseMode
    ? isSearching
      ? searchResults.length
      : browseChildren.length
    : listRowsFiltered.length;

  return (
    <div className="overflow-hidden rounded-xl bg-card text-card-foreground">
      <style>{`
        @keyframes browseIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes browseOut {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes browseFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .browse-anim-in {
          animation: browseIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .browse-anim-out {
          animation: browseOut 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .browse-anim-fade {
          animation: browseFade 220ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .browse-anim-in,
          .browse-anim-out,
          .browse-anim-fade {
            animation: none;
          }
        }
      `}</style>

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {displayCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {headerCount}
            </span>
          )}
        </div>
      </div>

      {/* Breadcrumbs (browse mode only, hidden while searching) */}
      {browseMode && !isSearching && breadcrumbItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-5 py-2.5 text-sm">
          {breadcrumbItems.map((item, idx) => {
            const isLast = idx === breadcrumbItems.length - 1;
            return (
              <React.Fragment key={`${item.pathIndex}:${item.id ?? "root"}`}>
                {idx > 0 && (
                  <KeyboardArrowRight
                    fontSize="small"
                    className="text-muted-foreground/60"
                  />
                )}
                {isLast ? (
                  <span className="font-medium text-foreground">
                    {item.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBreadcrumbClick?.(item.pathIndex)}
                    className="rounded px-1.5 py-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {item.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Search-results banner (browse mode while searching) */}
      {browseMode && isSearching && (
        <div className="flex items-center gap-2 bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
          <Search fontSize="small" />
          <span>
            Searching all categories —{" "}
            <button
              type="button"
              onClick={() => setFilter("")}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              clear search
            </button>{" "}
            to browse again.
          </span>
        </div>
      )}

      {showFilter && !hideFilter && (
        <div className="p-3">
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
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      )}

      {/* Animated content region */}
      <div key={animationKey} className={animationClass}>
        {rowsToRender.length === 0 ? (
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
                : browseMode
                  ? "No subcategories here"
                  : "No categories yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter.trim()
                ? "Try adjusting or clearing your search."
                : browseMode
                  ? "This category has no direct children."
                  : emptyMessage}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[40%]" />
                {showParentColumn && <col className="w-[20%]" />}
                <col className="w-[10%]" />
                <col className="w-[20%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Category
                  </th>

                  {showParentColumn && (
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Parent
                    </th>
                  )}

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Products
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Property
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rowsToRender.map((row) => {
                  const hasChildren = hasChildrenById(row._id);
                  const own = asPropertyRef(row.property);
                  const inheriting =
                    !!row.inheritProperty && !!getParentId(row);
                  const isInherited = inheriting && !!row.hasInheritedSnapshot;
                  const pendingSync = inheriting && !row.hasInheritedSnapshot;
                  const productCount = productCounts[row._id] ?? 0;

                  return (
                    <tr
                      key={row._id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      {/* Category — capped width so truncate kicks in */}
                      <td className="max-w-0 px-5 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {browseMode && hasChildren ? (
                            <button
                              type="button"
                              onClick={() => onOpenCategory?.(row)}
                              className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              aria-label={`Open ${row.name}`}
                            >
                              <KeyboardArrowRight fontSize="small" />
                            </button>
                          ) : (
                            <span className="inline-flex h-6 w-6 flex-none items-center justify-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-border" />
                            </span>
                          )}

                          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <FolderOpen fontSize="small" />
                          </div>

                          <div className="min-w-0 flex-1">
                            {browseMode && hasChildren ? (
                              <button
                                type="button"
                                onClick={() => onOpenCategory?.(row)}
                                className="block w-full truncate text-left font-medium text-foreground hover:underline"
                                title={row.name}
                              >
                                {row.name}
                              </button>
                            ) : (
                              <div
                                className="truncate font-medium text-foreground"
                                title={row.name}
                              >
                                {row.name}
                              </div>
                            )}
                            {row.url_slug && (
                              <div
                                className="truncate font-mono text-xs text-muted-foreground"
                                title={row.url_slug}
                              >
                                {row.url_slug}
                              </div>
                            )}
                          </div>

                          {hasChildren && (
                            <span className="ml-2 inline-flex flex-none items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {childrenCountById.get(row._id) ?? 0}
                            </span>
                          )}
                        </div>
                      </td>

                      {showParentColumn && (
                        <td className="max-w-0 px-5 py-3">
                          {row.parentName ? (
                            <span className="inline-flex w-full min-w-0 items-center gap-1.5 text-muted-foreground">
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
                      )}

                      {/* Products count */}
                      <td className="px-5 py-3">
                        {productCount > 0 ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-foreground"
                            title={`${productCount} product${
                              productCount === 1 ? "" : "s"
                            } directly in this category`}
                          >
                            <Inventory2
                              fontSize="small"
                              className="text-muted-foreground"
                            />
                            <span className="font-medium tabular-nums">
                              {productCount}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>

                      {/* Property */}
                      <td className="max-w-0 px-5 py-3">
                        {own || isInherited ? (
                          <span
                            className="inline-flex w-full min-w-0 items-center gap-1.5"
                            title={
                              own
                                ? own.code
                                  ? `${own.name} (${own.code})`
                                  : own.name
                                : "Inherited property"
                            }
                          >
                            <span className="truncate text-foreground">
                              {own?.name ?? "Inherited"}
                            </span>

                            {isInherited && (
                              <span
                                className="flex-none rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                title="Merged from ancestors + own property (own wins)"
                              >
                                Inherited
                              </span>
                            )}
                            {pendingSync && (
                              <span
                                className="flex-none rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                title="Inheritance is on but no snapshot has been generated yet. Use 'Re-run inheritance'."
                              >
                                Pending sync
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end">
                          <PopoverMenu
                            items={getMenuItems(row)}
                            aria-label={`Actions for ${row.name}`}
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
    </div>
  );
};

export default CategoryList;
