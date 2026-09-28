// app/marketing/content/hero_content/page.tsx
"use client";

import {
  findHeroContent,
  deleteHeroContent,
} from "@/app/actions/content_management";
import { HeroSection } from "@/constant/types";
import Link from "next/link";
import React, { useEffect, useMemo, useState, memo } from "react";
import {
  Edit,
  Add,
  Image as ImageIcon,
  Delete,
  Search,
  SearchOff,
  MoreVert,
  Close,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

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
          <ImageIcon className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering
          ? "No hero content matches your search"
          : "No hero content yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Add your first hero banner to get started."}
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
            href="/marketing/content/hero_content/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add fontSize="small" />
            Add Hero Content
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
        <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="h-40 animate-pulse bg-muted" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const HeroContentPage = () => {
  const [heroContent, setHeroContent] = useState<HeroSection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<HeroSection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHeroContent = async () => {
    try {
      setLoading(true);
      const content = await findHeroContent();
      if (content) {
        setHeroContent(content);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch hero content:", err);
      setError("Failed to load hero content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHeroContent();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting hero content…");

    try {
      const result = await deleteHeroContent(deleteTarget._id as string);
      if (result.success) {
        toast.success("Hero content deleted", { id: toastId });
        await fetchHeroContent();
        setDeleteTarget(null);
      } else {
        toast.error(result.error || "Failed to delete hero content", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error("Failed to delete hero content:", err);
      toast.error("An error occurred while deleting", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const visible = useMemo(() => {
    const list = heroContent ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((hero) => {
      const haystack = [hero.title, hero.description, hero.cta_text]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [heroContent, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (hero: HeroSection): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit hero",
      icon: <Edit fontSize="small" />,
      href: `/marketing/content/hero_content/edit?id=${hero._id}`,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(hero),
    },
  ];

  // ---------------- Early exits ----------------
  if (loading && !heroContent) {
    return <Skeleton />;
  }

  if (error && !heroContent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchHeroContent()}
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
            placeholder="Search hero content…"
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
          href="/marketing/content/hero_content/new"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Add fontSize="small" />
          Add Hero Content
        </Link>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Content                                                        */}
      {/* -------------------------------------------------------------- */}
      {visible.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <EmptyState isFiltering={isFiltering} onClear={() => setQuery("")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((hero) => (
            <div
              key={hero._id}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/30"
            >
              {/* Image */}
              <div className="relative h-40 bg-muted">
                {hero?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero.imageUrl as unknown as string}
                    alt={hero.title || "Hero banner"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                    <ImageIcon fontSize="large" />
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute right-2 top-2">
                  <PopoverMenu
                    items={getMenuItems(hero)}
                    ariaLabel={`Actions for ${hero.title || "hero"}`}
                    trigger={<MoreVert fontSize="small" />}
                    align="right"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {hero.title || "Untitled"}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {hero.description || "No description"}
                </p>

                {hero.cta_text && (
                  <div className="mt-3">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      CTA: {hero.cta_text}
                    </span>
                  </div>
                )}
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
        title="Delete hero content"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this hero banner"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
};

export default HeroContentPage;
