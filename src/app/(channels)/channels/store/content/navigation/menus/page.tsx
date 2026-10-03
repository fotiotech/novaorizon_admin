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
// Base path — this page lives under /channels/store/content/navigation/menus. Keep edit/create
// links derived from it so they can't drift apart.
// ------------------------------------------------------------------
const BASE_PATH = "/channels/store/content/navigation/menus";

// ------------------------------------------------------------------
// Types — mirror models/Menu.ts and lib/menu/constants.ts
// ------------------------------------------------------------------
type LinkType = "category" | "product" | "collection" | "page" | "custom";
type MenuDisplayType = "horizontal" | "vertical" | "mega";
type MenuTheme = "light" | "dark" | "inherit";
type SubmenuDisplayType = "dropdown" | "flyout" | "mega" | "grid" | "accordion";

interface MenuItemNode {
  _id?: string;
  label?: string;
  type?: LinkType;
  refId?: string | null;
  refModel?: string | null;
  url?: string;
  icon?: string | null;
  badge?: string | null;
  isVisible?: boolean;
  submenuDisplay?: SubmenuDisplayType | null;
  children?: MenuItemNode[];
}

interface MenuDisplayConfig {
  alignment?: string;
  gap?: number;
  animation?: string;
  showCaret?: boolean;
  megaWidth?: string;
  theme?: MenuTheme;
  borderless?: boolean;
  rounded?: boolean;
  shadow?: boolean;
}

interface Menu {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  items?: MenuItemNode[];
  location?: string;
  order: number;
  isSticky?: boolean;
  visible?: boolean;
  display: MenuDisplayType;
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  displayConfig?: MenuDisplayConfig;
  backgroundColor?: string;
  backgroundImage?: string;
  sectionTitle?: string;
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

const DISPLAY_LABEL: Record<MenuDisplayType, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  mega: "Mega",
};

const THEME_SWATCH: Record<MenuTheme, string> = {
  light: "bg-white border-neutral-300",
  dark: "bg-neutral-900 border-neutral-700",
  inherit: "bg-muted border-border",
};

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

function countTreeItems(items?: MenuItemNode[]): number {
  if (!items?.length) return 0;
  return items.reduce((sum, i) => sum + 1 + countTreeItems(i.children), 0);
}

function collectLinkTypes(items?: MenuItemNode[]): string[] {
  const types = new Set<string>();
  const walk = (list?: MenuItemNode[]) => {
    for (const item of list ?? []) {
      if (item.type) types.add(item.type);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(items);
  return Array.from(types);
}

function getItemsSummary(menu: Menu): string {
  const count = countTreeItems(menu.items);
  if (count === 0) return "No items";
  const types = collectLinkTypes(menu.items);
  const typeStr = types.length ? types.join(" · ") : "—";
  return `${count} item${count === 1 ? "" : "s"} · ${typeStr}`;
}

function getTheme(menu: Menu): MenuTheme {
  return menu.displayConfig?.theme ?? "light";
}

// ------------------------------------------------------------------
// Status dot (visible / hidden)
// ------------------------------------------------------------------
function StatusDot({ visible }: { visible: boolean }) {
  return (
    <span
      title={visible ? "Visible" : "Hidden"}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        visible ? "bg-emerald-500" : "bg-muted-foreground/40"
      }`}
    />
  );
}

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
            href={`${BASE_PATH}/create`}
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
// Display summary cell (layout + theme + columns + sticky)
// ------------------------------------------------------------------
function DisplayCell({ menu }: { menu: Menu }) {
  const theme = getTheme(menu);
  const isGrid = menu.display === "mega" || menu.display === "vertical";

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span className="text-sm text-foreground">
        {DISPLAY_LABEL[menu.display] ?? menu.display}
      </span>

      <span
        title={`Theme: ${theme}`}
        className={`inline-block h-3 w-3 rounded-full border ${
          THEME_SWATCH[theme]
        }`}
      />

      {menu.columns != null && isGrid && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
          {menu.columns} col
        </span>
      )}

      {menu.isSticky && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Sticky
        </span>
      )}
    </div>
  );
}

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
        setMenus((result.data as Menu[]) || []);
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
      const haystack = [
        m.name,
        m.description,
        m.location,
        m.sectionTitle,
        m.display,
      ]
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
      href: `${BASE_PATH}/edit?id=${menu._id}`,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(menu),
    },
  ];

  // ---------------- Loading skeleton ----------------
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

  // ---------------- Error state ----------------
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
      {/* Controls                                                        */}
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
          href={`${BASE_PATH}/create`}
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
                    Items
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
                  visibleMenus.map((menu) => {
                    const isVisible = menu.visible !== false;
                    return (
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
                              <div className="flex items-center gap-2">
                                <StatusDot visible={isVisible} />
                                <p className="truncate text-sm font-medium text-foreground">
                                  {menu.name}
                                </p>
                              </div>
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
                          <div
                            className="truncate text-sm text-foreground"
                            title={getItemsSummary(menu)}
                          >
                            {getItemsSummary(menu)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="truncate text-sm text-foreground">
                            {menu.location || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <DisplayCell menu={menu} />
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
                    );
                  })
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
              {visibleMenus.map((menu) => {
                const isVisible = menu.visible !== false;
                const theme = getTheme(menu);

                return (
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
                        <div className="flex items-center gap-2">
                          <StatusDot visible={isVisible} />
                          <p className="truncate text-sm font-medium text-foreground">
                            {menu.name}
                          </p>
                        </div>

                        {menu.sectionTitle && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            Section: {menu.sectionTitle}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="capitalize">
                            {DISPLAY_LABEL[menu.display] ?? menu.display}
                          </span>
                          <span
                            title={`Theme: ${theme}`}
                            className={`inline-block h-3 w-3 rounded-full border ${
                              THEME_SWATCH[theme]
                            }`}
                          />
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
                          {getItemsSummary(menu)}
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
                );
              })}
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
