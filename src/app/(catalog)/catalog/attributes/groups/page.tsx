"use client";

import {
  deleteAttributeGroup,
  findAllAttributeGroups,
} from "@/app/actions/attributegroup";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { AttributeGroupFormModal } from "./_component/AttributeGroupFormModal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import {
  Edit,
  Delete,
  FilterList,
  Search,
  SearchOff,
  AccountTree,
  MoreVert,
  Add,
  Close,
  KeyboardArrowRight,
  ListAlt,
  FolderOpen,
} from "@mui/icons-material";

// Types
type AttributesGroup = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  parentId?: string;
  sort_order: number;
  sortOrder?: number;
  children?: AttributesGroup[];
};

interface SortOption {
  value: "name_asc" | "name_desc" | "newest" | "oldest";
  label: string;
}

type FlatRow = {
  _id: string;
  name: string;
  code: string;
  parentId: string | null;
  parentName: string | null;
  level: number;
  hasChildren: boolean;
  childrenCount: number;
  isExpanded: boolean;
};

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const SELECT_STYLES = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.25)" : "none",
    minHeight: "38px",
    fontSize: "0.875rem",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    "&:hover": {
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--border))",
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    overflow: "hidden",
    boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
  }),
  menuPortal: (provided: any) => ({ ...provided, zIndex: 9999 }),
  menuList: (provided: any) => ({ ...provided, padding: 4 }),
  option: (provided: any, state: any) => ({
    ...provided,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected
      ? "hsl(var(--primary))"
      : state.isFocused
        ? "hsl(var(--accent))"
        : "hsl(var(--popover))",
    color: state.isSelected
      ? "hsl(var(--primary-foreground))"
      : "hsl(var(--popover-foreground))",
    cursor: "pointer",
    borderRadius: "0.375rem",
  }),
  singleValue: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  placeholder: (p: any) => ({ ...p, color: "hsl(var(--muted-foreground))" }),
  input: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  indicatorSeparator: (p: any) => ({
    ...p,
    backgroundColor: "hsl(var(--border))",
  }),
  dropdownIndicator: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    "&:hover": { color: "hsl(var(--foreground))" },
  }),
} as const;

const PORTAL_PROPS = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  menuPosition: "fixed" as const,
  menuShouldScrollIntoView: false,
} as const;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const getParentId = (g: any): string | null => {
  const pid = g?.parentId ?? g?.parent_id ?? null;
  if (pid === null || pid === undefined) return null;
  const s = String(pid).trim();
  return s === "" ? null : s;
};

const Group = () => {
  const [groups, setGroups] = useState<AttributesGroup[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>("");
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [filterText, setFilterText] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOption>({
    value: "name_asc",
    label: "Name A → Z",
  });

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // ---------- View mode: true = browse (drill-down), false = list (tree) ----------
  const [browseMode, setBrowseMode] = useState(true);
  const [browsePath, setBrowsePath] = useState<string[]>([]);

  const isSearching = filterText.trim() !== "";

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const groupsResponse = await findAllAttributeGroups();
        if (groupsResponse) {
          setGroups(groupsResponse as unknown as AttributesGroup[]);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ------------------------------------------------------------------
  // Flat lookup (groups from the server are a nested tree)
  // ------------------------------------------------------------------
  const allGroupsFlat = useMemo(() => {
    const result: any[] = [];
    const walk = (list: any[] | undefined) => {
      if (!list) return;
      for (const g of list) {
        result.push(g);
        walk(g.children);
      }
    };
    walk(groups as any[]);
    return result;
  }, [groups]);

  const nodesById = useMemo(() => {
    const map = new Map<string, any>();
    for (const g of allGroupsFlat) {
      if (g && g._id && !map.has(g._id)) map.set(g._id, g);
    }
    return map;
  }, [allGroupsFlat]);

  const childrenCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of allGroupsFlat) {
      const pid = getParentId(g);
      if (!pid) continue;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    return counts;
  }, [allGroupsFlat]);

  const resolveParentName = (g: any): string | null => {
    const pid = getParentId(g);
    if (!pid) return null;
    return nodesById.get(pid)?.name ?? null;
  };

  // ------------------------------------------------------------------
  // Auto-enter the single root on browse mode (if there is exactly one)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!browseMode) return;
    if (browsePath.length > 0) return;
    if (groups.length === 0) return;

    const roots = (groups as any[]).filter((g) => !getParentId(g));
    if (roots.length === 1) {
      setBrowsePath([roots[0]._id]);
    }
  }, [browseMode, browsePath.length, groups]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleFormSuccess = async () => {
    try {
      const res = await findAllAttributeGroups();
      setGroups(res as unknown as AttributesGroup[]);
      setSuccess(
        editGroupId
          ? "Group updated successfully!"
          : "Group created successfully!",
      );
      setEditGroupId("");
      setIsFormModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh groups");
    }
  };

  const handleOpenCreateModal = () => {
    setEditGroupId("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (groupId: string) => {
    setEditGroupId(groupId);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      await deleteAttributeGroup(deleteTargetId);
      const res = await findAllAttributeGroups();
      setGroups(res as unknown as AttributesGroup[]);
      // If the deleted group was anywhere in the browse path, reset to root.
      setBrowsePath((prev) => (prev.includes(deleteTargetId) ? [] : prev));
      setSuccess("Group deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeleteTargetId("");
      setDeleteTargetName("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroupExpansion = (id: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // ---------- Browse handlers ----------
  const handleOpenGroup = (group: any) => {
    setBrowsePath((prev) => [...prev, group._id]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setBrowsePath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
    setFilterText("");
  };

  const handleToggleMode = () => {
    setBrowseMode((prev) => !prev);
    setBrowsePath([]);
  };

  const getParentGroupName = (parentId: string) => {
    if (!parentId) return "—";
    return nodesById.get(parentId)?.name ?? parentId;
  };

  const sortOptions: SortOption[] = [
    { value: "name_asc", label: "Name A → Z" },
    { value: "name_desc", label: "Name Z → A" },
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
  ];

  const objectIdTimestamp = (id: string): number => {
    try {
      return parseInt(id.substring(0, 8), 16);
    } catch {
      return 0;
    }
  };

  const sortList = <T extends { name: string; _id: string }>(
    list: T[],
  ): T[] => {
    const copy = [...list];
    copy.sort((a, b) => {
      switch (sortOrder.value) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return objectIdTimestamp(b._id) - objectIdTimestamp(a._id);
        case "oldest":
          return objectIdTimestamp(a._id) - objectIdTimestamp(b._id);
        default:
          return 0;
      }
    });
    return copy;
  };

  // ------------------------------------------------------------------
  // List-mode rows (tree with expand/collapse)
  // ------------------------------------------------------------------
  const flattenedGroups = useMemo<FlatRow[]>(() => {
    const matchesFilter = (g: AttributesGroup): boolean => {
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        (g.code || "").toLowerCase().includes(q)
      );
    };

    const rows: FlatRow[] = [];
    const filterActive = filterText.trim() !== "";

    const walk = (list: any[], level: number) => {
      for (const g of sortList(list)) {
        const children = (g.children as any[]) || [];
        const selfMatches = matchesFilter(g);
        const childMatchesAny = filterActive
          ? children.some(
              (c: any) =>
                matchesFilter(c) || descendantMatches(c, matchesFilter),
            )
          : false;

        if (filterActive && !selfMatches && !childMatchesAny) continue;

        const isExpanded = expandedGroups.has(g._id) || filterActive;

        rows.push({
          _id: g._id,
          name: g.name,
          code: g.code,
          parentId: getParentId(g),
          parentName: resolveParentName(g),
          level,
          hasChildren: children.length > 0,
          childrenCount: children.length,
          isExpanded,
        });

        if (isExpanded && children.length > 0) {
          walk(children, level + 1);
        }
      }
    };

    const rootGroups = (groups as any[]).filter((g) => !getParentId(g));
    walk(rootGroups, 0);
    return rows;
  }, [groups, expandedGroups, filterText, sortOrder, nodesById]);

  const descendantMatches = (g: any, matcher: (x: any) => boolean): boolean => {
    const children = g.children || [];
    return children.some(
      (c: any) => matcher(c) || descendantMatches(c, matcher),
    );
  };

  // ------------------------------------------------------------------
  // Browse-mode: current level + global search
  // ------------------------------------------------------------------
  const browseCurrentParentId = useMemo(
    () => (browsePath.length > 0 ? browsePath[browsePath.length - 1] : null),
    [browsePath],
  );

  const browseChildren = useMemo(() => {
    return sortList(
      allGroupsFlat.filter((g) => {
        const pid = getParentId(g);
        if (browseCurrentParentId === null) return pid === null;
        return pid === browseCurrentParentId;
      }),
    );
  }, [allGroupsFlat, browseCurrentParentId, sortOrder]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [] as any[];
    const q = filterText.trim().toLowerCase();
    return sortList(
      allGroupsFlat.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.code || "").toLowerCase().includes(q),
      ),
    );
  }, [allGroupsFlat, filterText, isSearching, sortOrder]);

  const breadcrumbItems = useMemo(() => {
    const items: { id: string | null; name: string; pathIndex: number }[] = [
      { id: null, name: "All groups", pathIndex: -1 },
    ];
    for (const id of browsePath) {
      items.push({
        id,
        name: nodesById.get(id)?.name ?? "Unknown",
        pathIndex: browsePath.indexOf(id),
      });
    }
    return items;
  }, [browsePath, nodesById]);

  // ------------------------------------------------------------------
  // Rows to render (browse vs list)
  // ------------------------------------------------------------------
  const rowsToRender: FlatRow[] = useMemo(() => {
    const toRow = (g: any, level = 0): FlatRow => {
      const children = (g.children as any[]) || [];
      return {
        _id: g._id,
        name: g.name,
        code: g.code,
        parentId: getParentId(g),
        parentName: resolveParentName(g),
        level,
        hasChildren: children.length > 0,
        childrenCount: children.length,
        isExpanded: false,
      };
    };

    if (browseMode) {
      const source = isSearching ? searchResults : browseChildren;
      return source.map((g) => toRow(g, 0));
    }
    return flattenedGroups;
  }, [
    browseMode,
    isSearching,
    searchResults,
    browseChildren,
    flattenedGroups,
    nodesById,
  ]);

  // ------------------------------------------------------------------
  // Animation (direction-aware)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------------
  const hasActiveFilters =
    filterText.trim() !== "" || sortOrder.value !== "name_asc";
  const activeFilterCount =
    (filterText.trim() !== "" ? 1 : 0) +
    (sortOrder.value !== "name_asc" ? 1 : 0);

  const handleClearFilters = () => {
    setFilterText("");
    setSortOrder({ value: "name_asc", label: "Name A → Z" });
  };

  const getMenuItems = (group: any): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit group",
      icon: <Edit fontSize="small" />,
      onClick: () => handleOpenEditModal(group._id),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => handleDeleteClick(group._id, group.name),
    },
  ];

  const filterInputEl = (
    <div className="relative">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        placeholder="Search groups by name or code…"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );

  const sortSelectEl = (
    <Select<SortOption>
      options={sortOptions}
      value={sortOrder}
      onChange={(opt) => opt && setSortOrder(opt as SortOption)}
      classNamePrefix="react-select"
      styles={SELECT_STYLES}
      isSearchable={false}
      instanceId="attribute-group-sort"
      {...PORTAL_PROPS}
    />
  );

  const totalAtLevel = browseMode
    ? isSearching
      ? searchResults.length
      : browseChildren.length
    : flattenedGroups.length;

  return (
    <div className="mx-auto max-w-7xl py-8">
      {/* Animation keyframes */}
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

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Attribute groups
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organize attributes into hierarchical groups
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:hidden"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleMode}
            aria-pressed={!browseMode}
            title={browseMode ? "Switch to list view" : "Switch to browse view"}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:flex-initial"
          >
            {browseMode ? (
              <>
                <ListAlt fontSize="small" />
                List
              </>
            ) : (
              <>
                <FolderOpen fontSize="small" />
                Browse
              </>
            )}
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:flex-initial"
          >
            <Add fontSize="small" />
            New group
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>
            <strong className="font-medium">Error:</strong> {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="rounded p-0.5 transition hover:bg-destructive/10"
            aria-label="Dismiss error"
          >
            <Close fontSize="small" />
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span>
            <strong className="font-medium">Success:</strong> {success}
          </span>
          <button
            onClick={() => setSuccess(null)}
            className="rounded p-0.5 transition hover:bg-emerald-500/10"
            aria-label="Dismiss"
          >
            <Close fontSize="small" />
          </button>
        </div>
      )}

      {/* Desktop filter bar */}
      <div className="hidden sm:block">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-6">{filterInputEl}</div>
            <div className="lg:col-span-3">{sortSelectEl}</div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end border-t border-border pt-3">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Close fontSize="small" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search & Sort"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Search
            </label>
            {filterInputEl}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Sort by
            </label>
            {sortSelectEl}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Card */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {browseMode ? "Browse groups" : "All groups"}
            </h2>
            {totalAtLevel > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {totalAtLevel}
              </span>
            )}
          </div>
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Loading…
            </span>
          )}
        </div>

        {/* Breadcrumbs (browse mode, hidden while searching) */}
        {browseMode && !isSearching && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-5 py-2.5 text-sm">
            {breadcrumbItems.map((item, idx) => {
              const isLast = idx === breadcrumbItems.length - 1;
              const isHome = idx === 0;
              const homeClickable = isHome && browsePath.length > 0;
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
                  ) : isHome && !homeClickable ? (
                    <span className="text-muted-foreground">{item.name}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(item.pathIndex)}
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

        {/* Search-results banner */}
        {browseMode && isSearching && (
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
            <Search fontSize="small" />
            <span>
              Searching all groups —{" "}
              <button
                type="button"
                onClick={() => setFilterText("")}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                clear search
              </button>{" "}
              to browse again.
            </span>
          </div>
        )}

        {/* Animated content region */}
        <div key={animationKey} className={animationClass}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Code
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Parent
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && groups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16">
                      <div className="flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                      </div>
                    </td>
                  </tr>
                ) : rowsToRender.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          {filterText.trim() ? (
                            <SearchOff className="text-muted-foreground" />
                          ) : (
                            <AccountTree className="text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {filterText.trim()
                            ? "No groups match your search"
                            : browseMode && browsePath.length > 0
                              ? "No subgroups here"
                              : "No groups yet"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {filterText.trim()
                            ? "Try adjusting or clearing your search."
                            : browseMode && browsePath.length > 0
                              ? "This group has no direct children."
                              : "Create your first group to organize attributes."}
                        </p>
                        <div className="mt-4">
                          {filterText.trim() ? (
                            <button
                              onClick={handleClearFilters}
                              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                            >
                              Clear filters
                            </button>
                          ) : (
                            <button
                              onClick={handleOpenCreateModal}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                            >
                              <Add fontSize="small" />
                              New group
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rowsToRender.map((row) => (
                    <tr
                      key={row._id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-3">
                        <div
                          className="flex items-center gap-2"
                          style={{
                            paddingLeft: browseMode
                              ? "0rem"
                              : `${row.level * 1.25}rem`,
                          }}
                        >
                          {browseMode && row.hasChildren ? (
                            <button
                              type="button"
                              onClick={() => handleOpenGroup(row)}
                              className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              aria-label={`Open ${row.name}`}
                            >
                              <KeyboardArrowRight fontSize="small" />
                            </button>
                          ) : !browseMode && row.hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleGroupExpansion(row._id)}
                              className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              aria-label={
                                row.isExpanded ? "Collapse" : "Expand"
                              }
                              aria-expanded={row.isExpanded}
                            >
                              <KeyboardArrowRight
                                fontSize="small"
                                className={`transition-transform duration-200 ${
                                  row.isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                          ) : (
                            <span className="inline-flex h-6 w-6 flex-none items-center justify-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-border" />
                            </span>
                          )}
                          {browseMode && row.hasChildren ? (
                            <button
                              type="button"
                              onClick={() => handleOpenGroup(row)}
                              className="truncate text-left text-sm font-medium text-foreground hover:underline"
                              title={row.name}
                            >
                              {row.name}
                            </button>
                          ) : (
                            <span className="truncate text-sm font-medium text-foreground">
                              {row.name}
                            </span>
                          )}
                          {row.hasChildren && (
                            <span className="ml-1 inline-flex flex-none items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {row.childrenCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.code}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground">
                        {row.parentName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <AttributeGroupFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditGroupId("");
        }}
        onSuccess={handleFormSuccess}
        groupId={editGroupId || undefined}
        groups={groups}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId("");
          setDeleteTargetName("");
        }}
        onConfirm={handleConfirmDelete}
        title="Delete attribute group"
        message={`Are you sure you want to delete the group "${deleteTargetName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Group;
