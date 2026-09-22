// app/customers/segmentation/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  Add,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PeopleOutline,
  MoreVert,
  Search,
  SearchOff,
  Close,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface CustomerGroup {
  _id: string;
  name: string;
  description: string;
  customers: string[];
  isActive: boolean;
  createdAt: string;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------
const EmptyState = memo(function EmptyState({
  isFiltering,
  onClear,
  onNew,
}: {
  isFiltering: boolean;
  onClear: () => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isFiltering ? (
          <SearchOff className="text-muted-foreground" />
        ) : (
          <PeopleOutline className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No groups match your search" : "No customer groups yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Create your first segment to get started."}
      </p>
      <div className="mt-4">
        {isFiltering ? (
          <button
            onClick={onClear}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Clear search
          </button>
        ) : (
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add sx={{ fontSize: 14 }} />
            New Group
          </button>
        )}
      </div>
    </div>
  );
});

// ------------------------------------------------------------------
// Skeleton
// ------------------------------------------------------------------
const Skeleton = memo(function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted" />
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function SegmentationPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CustomerGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customer-groups");
      if (!response.ok) {
        throw new Error("Failed to load customer groups");
      }
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      console.error("Error fetching groups:", err);
      setError(err?.message || "Failed to load customer groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  // ---------- Form open/close ----------
  const openCreateForm = () => {
    setFormData({ name: "", description: "", isActive: true });
    setEditingId(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", description: "", isActive: true });
  };

  const handleEdit = (group: CustomerGroup) => {
    setFormData({
      name: group.name,
      description: group.description,
      isActive: group.isActive,
    });
    setEditingId(group._id);
    setShowForm(true);
  };

  // ---------- Save ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const toastId = toast.loading(
      editingId ? "Updating group…" : "Creating group…",
    );

    try {
      const url = editingId
        ? `/api/customer-groups/${editingId}`
        : "/api/customer-groups";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save group");
      }

      toast.success(editingId ? "Group updated" : "Group created", {
        id: toastId,
      });
      closeForm();
      await fetchGroups();
    } catch (err: any) {
      console.error("Error saving group:", err);
      toast.error(err?.message || "Failed to save group", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting group…");

    // Optimistic removal
    const removedIndex = groups.findIndex((g) => g._id === deleteTarget._id);
    const removed = groups[removedIndex];
    setGroups((prev) => prev.filter((g) => g._id !== deleteTarget._id));

    try {
      const response = await fetch(`/api/customer-groups/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete group");

      toast.success("Group deleted", { id: toastId });
      setDeleteTarget(null);
    } catch (err: any) {
      // Rollback
      setGroups((prev) => {
        const copy = [...prev];
        if (removed) copy.splice(removedIndex, 0, removed);
        return copy;
      });
      toast.error(err?.message || "Failed to delete group", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  // ---------- Filter ----------
  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const haystack = `${g.name} ${g.description}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [groups, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (group: CustomerGroup): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit group",
      icon: <EditIcon fontSize="small" />,
      onClick: () => handleEdit(group),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteIcon fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(group),
    },
  ];

  // ---------- Early exits ----------
  if (loading && groups.length === 0) {
    return <Skeleton />;
  }

  if (error && groups.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchGroups()}
            className="mt-4 rounded-lg border border-destructive/40 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      {/* -------------------------------------------------------------- */}
      {/* Controls — no title (top bar renders the page name)            */}
      {/* -------------------------------------------------------------- */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups…"
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>

        {isFiltering && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            title="Clear search"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Close fontSize="small" />
          </button>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Add sx={{ fontSize: 16 }} />
          New Group
        </button>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Inline create/edit form                                        */}
      {/* -------------------------------------------------------------- */}
      {showForm && (
        <div className="mb-4 overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit group" : "New group"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close form"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Close sx={{ fontSize: 16 }} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Group name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={INPUT_CLASS}
                  placeholder="e.g., VIP Customers, Premium Members"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`${INPUT_CLASS} resize-y`}
                  rows={3}
                  placeholder="Describe this customer segment…"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  Active
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-card px-4 py-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                )}
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create group"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Groups grid                                                    */}
      {/* -------------------------------------------------------------- */}
      {visibleGroups.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <EmptyState
            isFiltering={isFiltering}
            onClear={() => setQuery("")}
            onNew={openCreateForm}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleGroups.map((group) => (
            <div
              key={group._id}
              className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {group.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.customers?.length || 0} member
                    {group.customers?.length === 1 ? "" : "s"}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                    group.isActive
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                      : "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {group.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {group.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {group.description}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => handleEdit(group)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  <EditIcon sx={{ fontSize: 14 }} />
                  Edit
                </button>

                <PopoverMenu
                  items={getMenuItems(group)}
                  ariaLabel={`Actions for ${group.name}`}
                  trigger={<MoreVert fontSize="small" />}
                  align="right"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete customer group"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this group"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
}
