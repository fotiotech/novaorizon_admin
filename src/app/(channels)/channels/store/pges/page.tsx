// app/channels/store/pages/page.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import Link from "next/link";
import {
  Add,
  Edit,
  Delete,
  Search,
  SearchOff,
  Description,
  MoreVert,
  Close,
} from "@mui/icons-material";
import { getPages, deletePage } from "@/app/actions/pageActions";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface PageItem {
  _id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "review" | "archived" | string;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

// ------------------------------------------------------------------
// Status badge
// ------------------------------------------------------------------
const statusStyles: Record<string, string> = {
  published:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  review:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  archived:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
  draft:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
};

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const key = (status || "draft").toLowerCase();
  const cls = statusStyles[key] ?? statusStyles.draft;
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
});

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
          <Description className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No pages match your search" : "No pages yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Create your first page to get started."}
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
            href="/channels/store/pages/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add fontSize="small" />
            New Page
          </Link>
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
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="flex-1" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default function PagesList() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data: any = await getPages();
      setPages((data as PageItem[]) ?? []);
      setError(null);
    } catch (err) {
      console.error("Failed to load pages:", err);
      setError("Failed to load pages");
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPages();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting page…");

    // Optimistic removal
    const removedIndex = pages.findIndex((p) => p._id === deleteTarget._id);
    const removed = pages[removedIndex];
    setPages((prev) => prev.filter((p) => p._id !== deleteTarget._id));

    try {
      await deletePage(deleteTarget._id);
      toast.success(`"${removed.title}" deleted`, { id: toastId });
      setDeleteTarget(null);
    } catch (err: any) {
      // Rollback
      setPages((prev) => {
        const copy = [...prev];
        if (removed) copy.splice(removedIndex, 0, removed);
        return copy;
      });
      toast.error(err?.message || "Failed to delete page", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const visiblePages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => {
      const haystack = `${p.title} ${p.slug} ${p.status}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [pages, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (page: PageItem): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit page",
      icon: <Edit fontSize="small" />,
      href: `/channels/store/pages/${page._id}/edit`,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(page),
    },
  ];

  // ---------------- Early exits ----------------
  if (loading && pages.length === 0) {
    return <Skeleton />;
  }

  if (error && pages.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchPages()}
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
            placeholder="Search pages…"
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
          href="/channels/store/pages/new"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Add fontSize="small" />
          New Page
        </Link>
      </div>

      {/* Card */}
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">All pages</h2>
            {visiblePages.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visiblePages.length}
              </span>
            )}
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Loading…
            </span>
          )}
        </div>

        {/* ----------------------- DESKTOP TABLE ----------------------- */}
        <div className="hidden md:block">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "40%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Slug
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Published
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visiblePages.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        isFiltering={isFiltering}
                        onClear={() => setQuery("")}
                      />
                    </td>
                  </tr>
                ) : (
                  visiblePages.map((page) => (
                    <tr
                      key={page._id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/channels/store/pages/${page._id}/edit`}
                          className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
                        >
                          {page.title || "Untitled"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {page.slug || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={page.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-muted-foreground">
                          {formatDate(page.publishedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <PopoverMenu
                            items={getMenuItems(page)}
                            ariaLabel={`Actions for ${page.title}`}
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
          {visiblePages.length === 0 ? (
            <EmptyState
              isFiltering={isFiltering}
              onClear={() => setQuery("")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {visiblePages.map((page) => (
                <li key={page._id} className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/channels/store/pages/${page._id}/edit`}
                        className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
                      >
                        {page.title || "Untitled"}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {page.slug || "—"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={page.status} />
                        <span className="text-[11px] text-muted-foreground">
                          {page.publishedAt
                            ? `Published ${formatDate(page.publishedAt)}`
                            : "Not published"}
                        </span>
                      </div>
                    </div>

                    <div className="flex-none">
                      <PopoverMenu
                        items={getMenuItems(page)}
                        ariaLabel={`Actions for ${page.title}`}
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
        title="Delete page"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this page"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
}
