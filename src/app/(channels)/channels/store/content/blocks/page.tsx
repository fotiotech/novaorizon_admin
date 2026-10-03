// app/marketing/content/blocks/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState, memo } from "react";
import {
  Add,
  Close,
  Delete,
  Edit,
  MoreVert,
  Search,
  SearchOff,
  ViewModule,
} from "@mui/icons-material";
import { getAllBlocks, deleteBlock } from "@/app/actions/contentBlock";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

const BASE_PATH = "/channels/store/content/blocks";

interface Block {
  _id: string;
  name: string;
  description?: string;
  location: string;
  sectionTitle?: string;
  order: number;
  visible: boolean;
  display: string;
  columns: number;
  source: {
    type: string;
    collectionId?: string;
    promotionId?: string;
    promotionMode?: string;
    recommendationKind?: string;
    relatedStrategy?: string;
    refs?: unknown[];
    limit?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const formatDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function describeSource(block: Block): string {
  const s = block.source ?? ({} as Block["source"]);
  switch (s.type) {
    case "collection":
      return "Collection";
    case "promotion":
      return `Promotion · ${s.promotionMode ?? "products"}`;
    case "recommendation":
      return `Recommendation · ${s.recommendationKind ?? "—"}`;
    case "related":
      return `Related · ${s.relatedStrategy ?? "auto"}`;
    case "manual":
      return `Manual · ${s.refs?.length ?? 0} ref${(s.refs?.length ?? 0) === 1 ? "" : "s"}`;
    default:
      return s.type ?? "—";
  }
}

const StatusDot = memo(function StatusDot({ visible }: { visible: boolean }) {
  return (
    <span
      title={visible ? "Visible" : "Hidden"}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        visible ? "bg-emerald-500" : "bg-muted-foreground/40"
      }`}
    />
  );
});

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
          <ViewModule className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No blocks match your search" : "No blocks yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Create your first content block to get started."}
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
            Add Block
          </Link>
        )}
      </div>
    </div>
  );
});

const BlocksPage = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Block | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const result = await getAllBlocks();
      if (result.success) {
        setBlocks((result.data as Block[]) || []);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch blocks");
      }
    } catch (err) {
      console.error("Failed to load blocks:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBlocks();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const index = blocks.findIndex((b) => b._id === deleteTarget._id);
    if (index === -1) return;
    const removed = blocks[index];
    setIsDeleting(true);
    setBlocks((prev) => prev.filter((b) => b._id !== removed._id));

    try {
      const result = await deleteBlock(removed._id);
      if (result.success) {
        toast.success(`"${removed.name}" deleted`);
        setDeleteTarget(null);
      } else {
        setBlocks((prev) => {
          const copy = [...prev];
          copy.splice(index, 0, removed);
          return copy;
        });
        toast.error(result.error || "Failed to delete block");
      }
    } catch {
      setBlocks((prev) => {
        const copy = [...prev];
        copy.splice(index, 0, removed);
        return copy;
      });
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const visibleBlocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter((b) => {
      const haystack = [
        b.name,
        b.description,
        b.location,
        b.sectionTitle,
        b.source?.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [blocks, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (b: Block): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit block",
      icon: <Edit fontSize="small" />,
      href: `${BASE_PATH}/edit?id=${b._id}`,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(b),
    },
  ];

  if (loading && blocks.length === 0) {
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

  if (error && blocks.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchBlocks()}
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
            placeholder="Search blocks…"
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>

        {isFiltering && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
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
          Add Block
        </Link>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              All blocks
            </h2>
            {visibleBlocks.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visibleBlocks.length}
              </span>
            )}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "14%" }} />
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
                    Source
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
                {visibleBlocks.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        isFiltering={isFiltering}
                        onClear={() => setQuery("")}
                      />
                    </td>
                  </tr>
                ) : (
                  visibleBlocks.map((b) => (
                    <tr
                      key={b._id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot visible={b.visible !== false} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {b.name}
                            </p>
                            {b.sectionTitle && (
                              <p className="truncate text-xs text-muted-foreground">
                                {b.sectionTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">
                          {b.order}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="truncate text-sm text-foreground">
                          {describeSource(b)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">
                          {b.location}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-sm text-foreground capitalize">
                            {b.display}
                          </span>
                          {b.display === "grid" && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {b.columns} col
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(b.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <PopoverMenu
                            items={getMenuItems(b)}
                            ariaLabel={`Actions for ${b.name}`}
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

        {/* Mobile cards */}
        <div className="md:hidden">
          {visibleBlocks.length === 0 ? (
            <EmptyState
              isFiltering={isFiltering}
              onClear={() => setQuery("")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {visibleBlocks.map((b) => (
                <li key={b._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusDot visible={b.visible !== false} />
                        <p className="truncate text-sm font-medium text-foreground">
                          {b.name}
                        </p>
                      </div>
                      {b.sectionTitle && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {b.sectionTitle}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="capitalize">{b.display}</span>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                          {b.location}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {describeSource(b)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Order {b.order} · {formatDate(b.createdAt)}
                      </p>
                    </div>
                    <div className="flex-none">
                      <PopoverMenu
                        items={getMenuItems(b)}
                        ariaLabel={`Actions for ${b.name}`}
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete block"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this block"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
};

export default BlocksPage;
