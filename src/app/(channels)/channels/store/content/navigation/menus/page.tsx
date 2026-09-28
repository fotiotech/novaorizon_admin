// app/marketing/content/navigation/menus/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState, memo } from "react";
import {
  Add,
  Close,
  Delete,
  Edit,
  MenuOpen,
  MoreVert,
  Search,
  SearchOff,
} from "@mui/icons-material";
import { getAllMenus, deleteMenu } from "@/app/actions/menu";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface Menu {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  collectionId?: string | { _id: string; name: string } | null;
  link?: string;
  location?: string;
  display: string;
  position?: string;
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getContentSource = (menu: Menu) => {
  if (menu.collectionId) {
    if (typeof menu.collectionId === "object" && menu.collectionId.name) {
      return `Collection: ${menu.collectionId.name}`;
    }
    return `Collection ID: ${menu.collectionId}`;
  }
  if (menu.link) {
    return `Link: ${menu.link}`;
  }
  return "—";
};

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------
const EmptyState = memo(function EmptyState({
  isFiltering,
  onClear,
}: {
  isFiltering: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isFiltering ? (
          <SearchOff className="text-muted-foreground" />
        ) : (
          <MenuOpen className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No menus match your search" : "No menus yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Create your first menu to get started."}
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
          <Link
            href="/marketing/content/navigation/menus/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add fontSize="small" />
            Add Menu
          </Link>
        )}
      </div>
    </div>
  );
});

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------
const MenuPage = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const result = await getAllMenus();
      if (result.success) {
        setMenus(result.data || []);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch menus");
      }
    } catch (err) {
      console.error("Failed to load menus:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMenus();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const index = menus.findIndex((m) => m._id === deleteTarget._id);
    if (index === -1) return;

    const removed = menus[index];
    setIsDeleting(true);

    // Optimistic removal
    setMenus((prev) => prev.filter((menu) => menu._id !== removed._id));

    try {
      const result = await deleteMenu(removed._id);
      if (result.success) {
        toast.success(`"${removed.name}" deleted`);
        setDeleteTarget(null);
      } else {
        // Restore at original position
        setMenus((prev) => {
          const copy = [...prev];
          copy.splice(index, 0, removed);
          return copy;
        });
        toast.error(result.error || "Failed to delete menu");
      }
    } catch (err) {
      setMenus((prev) => {
        const copy = [...prev];
        copy.splice(index, 0, removed);
        return copy;
      });
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const visibleMenus = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menus;
    return menus.filter((m) => {
      const haystack = [m.name, m.description, m.location, m.sectionTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [menus, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (menu: Menu): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit menu",
      icon: <Edit fontSize="small" />,
      href: `/marketing/content/navigation/menus/edit?id=${menu._id}`,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(menu),
    },
  ];

  // ---------------- Early exits ----------------
  if (loading && menus.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl overflow-x-clip">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="flex-1" />
                <div className="h-8 w-8 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && menus.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchMenus()}
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
            placeholder="Search menus…"
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

        <Link
          href="/marketing/content/navigation/menus/create"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Add fontSize="small" />
          Add Menu
        </Link>
      </div>

      {/* Card */}
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">All menus</h2>
            {visibleMenus.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visibleMenus.length}
              </span>
            )}
          </div>
        </div>

        {/* ----------------------- DESKTOP TABLE ----------------------- */}
        <div className="hidden md:block">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Order
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Content source
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Location
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Display
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleMenus.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        isFiltering={isFiltering}
                        onClear={() => setQuery("")}
                      />
                    </td>
                  </tr>
                ) : (
                  visibleMenus.map((menu) => (
                    <tr
                      key={menu._id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded bg-muted">
                            {menu.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={menu.image}
                                alt={menu.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <MenuOpen
                                fontSize="small"
                                className="text-muted-foreground"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {menu.name}
                            </p>
                            {menu.sectionTitle && (
                              <p className="truncate text-xs text-muted-foreground">
                                Section: {menu.sectionTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-foreground">
                          {menu.order}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-foreground">
                          {getContentSource(menu)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-foreground">
                          {menu.location || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="capitalize">{menu.display}</span>
                          {menu.position && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                              {menu.position}
                            </span>
                          )}
                          {menu.columns && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                              {menu.columns} col
                            </span>
                          )}
                          {menu.isSticky && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              Sticky
                            </span>
                          )}
                          {menu.backgroundColor && (
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-border"
                              style={{ backgroundColor: menu.backgroundColor }}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-muted-foreground">
                          {formatDate(menu.createdAt ?? menu.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <PopoverMenu
                            items={getMenuItems(menu)}
                            ariaLabel={`Actions for ${menu.name}`}
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

        {/* ------------------------ MOBILE CARDS ----------------------- */}
        <div className="md:hidden">
          {visibleMenus.length === 0 ? (
            <EmptyState
              isFiltering={isFiltering}
              onClear={() => setQuery("")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {visibleMenus.map((menu) => (
                <li key={menu._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded bg-muted">
                      {menu.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={menu.image}
                          alt={menu.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <MenuOpen
                          fontSize="small"
                          className="text-muted-foreground"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {menu.name}
                      </p>
                      {menu.sectionTitle && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          Section: {menu.sectionTitle}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="capitalize">{menu.display}</span>
                        {menu.location && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                            {menu.location}
                          </span>
                        )}
                        {menu.isSticky && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            Sticky
                          </span>
                        )}
                      </div>

                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {getContentSource(menu)}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Order {menu.order} ·{" "}
                        {formatDate(menu.createdAt ?? menu.created_at)}
                      </p>
                    </div>

                    <div className="flex-none">
                      <PopoverMenu
                        items={getMenuItems(menu)}
                        ariaLabel={`Actions for ${menu.name}`}
                        trigger={<MoreVert fontSize="small" />}
                        align="right"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete menu"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this menu"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
};

export default MenuPage;
