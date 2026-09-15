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
import { Edit, Delete, FilterList } from "@mui/icons-material";

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

// Main Group Component
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

  // Filter / sort
  const [filterText, setFilterText] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOption>({
    value: "name_asc",
    label: "Name A → Z",
  });

  // Mobile bottom sheet
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Fetch data on component mount
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

  // Toggle group expansion in overview
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

  // Get the parent group name
  const getParentGroupName = (parentId: string) => {
    if (!parentId) return "-";
    const parent = groups.find((g) => g._id === parentId);
    return parent ? parent.name : parentId;
  };

  // Get attribute names for display
  const getAttributeNames = (attributeIds: string[] = []) => {
    return attributeIds
      .map((id) => {
        const attr = attributes.find((a) => a._id === id);
        return attr ? attr.name : null;
      })
      .filter(Boolean)
      .join(", ");
  };

  // Sort options
  const sortOptions: SortOption[] = [
    { value: "name_asc", label: "Name A → Z" },
    { value: "name_desc", label: "Name Z → A" },
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
  ];

  // Helper: extract creation timestamp from a Mongo ObjectId (first 4 bytes).
  const objectIdTimestamp = (id: string): number => {
    try {
      return parseInt(id.substring(0, 8), 16);
    } catch {
      return 0;
    }
  };

  // Flatten groups for table display with hierarchy information
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

      // When a filter is active, we force-expand everything below a
      // matching node so the user can actually see the matches inside
      // collapsed trees.
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

        // Skip non-matching leaves entirely.
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

  // Active filter state
  const hasActiveFilters =
    filterText.trim() !== "" || sortOrder.value !== "name_asc";
  const activeFilterCount =
    (filterText.trim() !== "" ? 1 : 0) +
    (sortOrder.value !== "name_asc" ? 1 : 0);

  const handleClearFilters = () => {
    setFilterText("");
    setSortOrder({ value: "name_asc", label: "Name A → Z" });
  };

  // Theme-aware react-select styles (consistent with Attributes page)
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--border))",
      color: "hsl(var(--foreground))",
      borderRadius: "0.5rem",
      boxShadow: "none",
      "&:hover": { borderColor: "hsl(var(--primary))" },
      minHeight: "42px",
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "hsl(var(--card))",
      color: "hsl(var(--card-foreground))",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused
        ? "hsl(var(--muted))"
        : "hsl(var(--card))",
      color: "hsl(var(--card-foreground))",
      "&:active": {
        backgroundColor: "hsl(var(--primary) / 0.2)",
      },
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "hsl(var(--foreground))",
    }),
    input: (base: any) => ({
      ...base,
      color: "hsl(var(--foreground))",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "hsl(var(--muted-foreground))",
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  // Shared filter controls — reused in desktop bar and mobile sheet
  const filterInputEl = (
    <input
      type="text"
      placeholder="Search groups by name or code..."
      value={filterText}
      onChange={(e) => setFilterText(e.target.value)}
      className="w-full p-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
    />
  );

  const sortSelectEl = (
    <Select<SortOption>
      options={sortOptions}
      value={sortOrder}
      onChange={(opt) => opt && setSortOrder(opt as SortOption)}
      classNamePrefix="react-select"
      styles={selectStyles}
      isSearchable={false}
      instanceId="attribute-group-sort"
      menuPortalTarget={
        typeof document !== "undefined" ? document.body : undefined
      }
      menuPosition="fixed"
    />
  );

  return (
    <div className="max-w-7xl mx-auto lg:px-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="font-bold text-2xl text-foreground">Attribute Groups</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mobile-only: opens the bottom-sheet filter UI */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="sm:hidden relative inline-flex items-center justify-center gap-2 flex-1 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-muted transition text-foreground"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="btn inline-flex items-center gap-1 flex-1 sm:flex-initial justify-center"
          >
            <span>+</span> New Group
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Success:</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      {/* Desktop-only inline filter & sort */}
      <div className="mb-3 hidden sm:flex gap-3 items-center">
        <div className="flex-1">{filterInputEl}</div>
        <div className="w-56">{sortSelectEl}</div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-md transition-colors"
            title="Clear filters"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile-only filter bottom sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search & Sort"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Search
            </label>
            {filterInputEl}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Sort by
            </label>
            {sortSelectEl}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Groups Table */}
      <div className="bg-card p-4 rounded-lg shadow-md border border-border overflow-x-auto">
        {isLoading && groups.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No groups created yet. Click the "New Group" button to create one.
          </p>
        ) : flattenedGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No groups match your search.</p>
            <button
              onClick={handleClearFilters}
              className="text-primary hover:underline text-sm mt-2"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Parent
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Attributes
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flattenedGroups.map((group) => (
                <tr key={group._id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {group.hasChildren && (
                        <button
                          type="button"
                          onClick={() => toggleGroupExpansion(group._id)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-foreground"
                        >
                          {group.isExpanded ? "−" : "+"}
                        </button>
                      )}
                      <span
                        style={{ marginLeft: `${group.level * 20}px` }}
                        className="text-sm font-medium text-foreground"
                      >
                        {group.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">
                      {group.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">
                      {getParentGroupName(
                        group.parent_id || group.parentId || "",
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {group.attributes && group.attributes.length > 0
                        ? `${group.attributes.length} attribute(s)`
                        : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(group._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                        title="Edit group"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(group._id, group.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
                        title="Delete group"
                      >
                        <Delete className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
        title="Delete Attribute Group"
        message={`Are you sure you want to delete the group "${deleteTargetName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Group;
