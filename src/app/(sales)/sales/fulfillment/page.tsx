// app/sales/carriers/page.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import Link from "next/link";
import { getCarriers, deleteCarrier } from "@/app/actions/carrier";
import {
  Add,
  Edit,
  Delete,
  Search,
  SearchOff,
  LocalShipping,
  MoreVert,
  Close,
  Visibility,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface Region {
  _id: string;
  region: string;
}

interface Carrier {
  _id: string;
  name: string;
  contact?: string;
  email?: string;
  costWeight?: number | string;
  regionsServed?: Region[];
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
          <LocalShipping className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No carriers match your search" : "No carriers yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Create your first carrier to start assigning shipments."}
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
            href="/sales/carriers/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add fontSize="small" />
            New Carrier
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
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-3 flex gap-1.5">
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function CarrierListPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Carrier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCarriers = async () => {
    setLoading(true);
    try {
      const data = await getCarriers();
      setCarriers((data as Carrier[]) ?? []);
    } catch (err) {
      console.error("Failed to load carriers:", err);
      setCarriers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCarriers();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCarrier(deleteTarget._id);
      setCarriers((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete carrier:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const visibleCarriers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return carriers;
    return carriers.filter((c) => {
      const haystack = [
        c.name,
        c.contact,
        c.email,
        ...(c.regionsServed ?? []).map((r) => r.region),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [carriers, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (carrier: Carrier): PopoverMenuItem[] => [
    {
      key: "view",
      label: "View orders",
      icon: <Visibility fontSize="small" />,
      href: `/sales/carriers/${carrier._id}`,
    },
    {
      key: "edit",
      label: "Edit carrier",
      icon: <Edit fontSize="small" />,
      href: `/sales/carriers/edit/${carrier._id}`,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(carrier),
    },
  ];

  if (loading && carriers.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-clip">
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
            placeholder="Search carriers…"
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
          href="/sales/carriers/create"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Add fontSize="small" />
          New Carrier
        </Link>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Content                                                        */}
      {/* -------------------------------------------------------------- */}
      {visibleCarriers.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <EmptyState
            isFiltering={isFiltering}
            onClear={() => setQuery("")}
            onNew={() => {
              /* Link handles navigation */
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleCarriers.map((carrier) => {
            const regions = carrier.regionsServed ?? [];
            return (
              <div
                key={carrier._id}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {carrier.name}
                    </h2>

                    <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {carrier.contact && (
                        <p className="truncate">Contact: {carrier.contact}</p>
                      )}
                      <p className="truncate">
                        Email: {carrier.email || "N/A"}
                      </p>
                      <p className="truncate">
                        Cost per kg:{" "}
                        {carrier.costWeight != null ? carrier.costWeight : "—"}
                      </p>
                    </div>

                    {regions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {regions.map((region) => (
                          <span
                            key={region._id}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          >
                            {region.region}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-none">
                    <PopoverMenu
                      items={getMenuItems(carrier)}
                      ariaLabel={`Actions for ${carrier.name}`}
                      trigger={<MoreVert fontSize="small" />}
                      align="right"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete carrier"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger={true}
      />
    </div>
  );
}
