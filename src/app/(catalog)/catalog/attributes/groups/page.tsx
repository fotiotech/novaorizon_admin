"use client";

import {
  deleteAttributeGroup,
  findAllAttributeGroups,
} from "@/app/actions/attributegroup";
import { findAttributesAndValues } from "@/app/actions/attributes";
import React, { useEffect, useMemo, useState } from "react";
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
} from "@mui/icons-material";

// Types
type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  option?: string;
  type: string;
  sort_order: number;
};

type AttributesGroup = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  parentId?: string;
  attributes?: string[];
  sort_order: number;
  sortOrder?: number;
  children?: AttributesGroup[];
};

interface SortOption {
  value: "name_asc" | "name_desc" | "newest" | "oldest";
  label: string;
}

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

const Group = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [attributesResponse, groupsResponse] = await Promise.all([
          findAttributesAndValues(),
          findAllAttributeGroups(),
        ]);

        if (attributesResponse?.length > 0) {
          setAttributes(attributesResponse as unknown as AttributeType[]);
        }

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
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getParentGroupName = (parentId: string) => {
    if (!parentId) return "—";
    const parent = groups.find((g) => g._id === parentId);
    return parent ? parent.name : parentId;
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

  const flattenedGroups = useMemo(() => {
    const matchesFilter = (g: AttributesGroup): boolean => {
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        (g.code || "").toLowerCase().includes(q)
      );
    };

    const sortList = (list: AttributesGroup[]): AttributesGroup[] => {
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

    const flatten = (groupList: AttributesGroup[], level = 0): any[] => {
      let result: any[] = [];
      const filterActive = filterText.trim() !== "";

      groupList.forEach((group) => {
        const selfMatches = matchesFilter(group);
        const childMatchesAny = filterActive
          ? (function anyDescendantMatches(g: AttributesGroup): boolean {
              return (g.children || []).some(
                (c) => matchesFilter(c) || anyDescendantMatches(c),
              );
            })(group)
          : false;

        if (filterActive && !selfMatches && !childMatchesAny) return;

        result.push({
          ...group,
          level,
          hasChildren: group.children && group.children.length > 0,
          isExpanded: expandedGroups.has(group._id) || filterActive,
        });

        const shouldExpand =
          expandedGroups.has(group._id) || (filterActive && childMatchesAny);

        if (shouldExpand && group.children) {
          result = result.concat(flatten(sortList(group.children), level + 1));
        }
      });

      return result;
    };

    const rootGroups = groups.filter(
      (group) => !group.parent_id && !group.parentId,
    );
    return flatten(sortList(rootGroups));
  }, [groups, expandedGroups, filterText, sortOrder]);

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

  // Shared filter controls
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

  return (
    <div className="mx-auto max-w-7xl py-8">
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
              All groups
            </h2>
            {flattenedGroups.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {flattenedGroups.length}
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

        {/* Table */}
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
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Attributes
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                  </td>
                </tr>
              ) : flattenedGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16">
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
                          : "No groups yet"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {filterText.trim()
                          ? "Try adjusting or clearing your search."
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
                flattenedGroups.map((group) => (
                  <tr
                    key={group._id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${group.level * 1.25}rem` }}
                      >
                        {group.hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleGroupExpansion(group._id)}
                            className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label={
                              group.isExpanded ? "Collapse" : "Expand"
                            }
                            aria-expanded={group.isExpanded}
                          >
                            <KeyboardArrowRight
                              fontSize="small"
                              className={`transition-transform duration-200 ${
                                group.isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="inline-flex h-6 w-6 flex-none items-center justify-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-border" />
                          </span>
                        )}
                        <span className="truncate text-sm font-medium text-foreground">
                          {group.name}
                        </span>
                        {group.hasChildren && (
                          <span className="ml-1 inline-flex flex-none items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {group.children.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {group.code}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground">
                      {getParentGroupName(
                        group.parent_id || group.parentId || "",
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {group.attributes && group.attributes.length > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {group.attributes.length} attribute
                          {group.attributes.length === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div className="flex justify-end">
                        <PopoverMenu
                          items={getMenuItems(group)}
                          ariaLabel={`Actions for ${group.name}`}
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

      {/* Form Modal */}
      <AttributeGroupFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditGroupId("");
        }}
        onSuccess={handleFormSuccess}
        groupId={editGroupId || undefined}
        attributes={attributes}
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
