// app/customers/customers/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import Link from "next/link";
import {
  Search,
  SearchOff,
  Delete,
  MoreVert,
  Close,
  Person2,
} from "@mui/icons-material";
import { getAllCustomers, deleteCustomer } from "@/app/actions/customer";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "react-hot-toast";
import { Eye } from "lucide-react";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface Customer {
  _id: string;
  userId: string;
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    city?: string;
    country?: string;
  };
  createdAt: string;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function displayName(c: Customer) {
  const first = c.billingAddress?.firstName ?? "";
  const last = c.billingAddress?.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Unnamed customer";
}

function initials(c: Customer) {
  const a = c.billingAddress?.firstName?.[0] ?? "";
  const b = c.billingAddress?.lastName?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

function location(c: Customer) {
  const parts = [c.billingAddress?.city, c.billingAddress?.country].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : "—";
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
          <Person2 className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No customers match your search" : "No customers yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Customers will appear here once they place an order."}
      </p>
      {isFiltering && (
        <div className="mt-4">
          <button
            onClick={onClear}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Clear search
          </button>
        </div>
      )}
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
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="flex-1" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const limit = 10;

  // ---------- Debounced search ----------
  const runDebounced = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
    setPage(1);
  }, 400);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    runDebounced(e.target.value);
  };

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    runDebounced.cancel();
  };

  // ---------- Fetch ----------
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllCustomers({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
      });
      if (result.success) {
        setCustomers(result.customers as Customer[]);
        setTotalPages(result.pages);
        setTotalCustomers(result.total);
      } else {
        setError("Failed to load customers.");
      }
    } catch (err: any) {
      console.error("Failed to load customers:", err);
      setError(err?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  // ---------- Delete ----------
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting customer…");
    try {
      const result = await deleteCustomer(deleteTarget._id);
      if (result.success) {
        toast.success("Customer deleted", { id: toastId });
        setCustomers((prev) => prev.filter((c) => c._id !== deleteTarget._id));
        setDeleteTarget(null);
        await fetchCustomers();
      } else {
        toast.error("Failed to delete customer", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete customer", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isFiltering = debouncedSearch.trim() !== "";

  const getMenuItems = (customer: Customer): PopoverMenuItem[] => [
    {
      key: "view",
      label: "View customer",
      icon: <Eye fontSize="small" />,
      href: `/customers/customers/${customer._id}`,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(customer),
    },
  ];

  // ---------- Early exits ----------
  if (loading && customers.length === 0) {
    return <Skeleton />;
  }

  if (error && customers.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchCustomers()}
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
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name or email…"
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>

        {search && (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            title="Clear search"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Close fontSize="small" />
          </button>
        )}
      </div>

      {/* Card */}
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              All customers
            </h2>
            {totalCustomers > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {totalCustomers}
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
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Phone
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Location
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Joined
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        isFiltering={isFiltering}
                        onClear={handleClearSearch}
                      />
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary">
                            {initials(customer)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/customers/customers/${customer._id}`}
                              className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
                            >
                              {displayName(customer)}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-muted-foreground">
                          {customer.billingAddress?.email || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-muted-foreground">
                          {customer.billingAddress?.phone || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-muted-foreground">
                          {location(customer)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-xs text-muted-foreground">
                          {formatDate(customer.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <PopoverMenu
                            items={getMenuItems(customer)}
                            ariaLabel={`Actions for ${displayName(customer)}`}
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
          {customers.length === 0 ? (
            <EmptyState isFiltering={isFiltering} onClear={handleClearSearch} />
          ) : (
            <ul className="divide-y divide-border">
              {customers.map((customer) => (
                <li key={customer._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {initials(customer)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/customers/customers/${customer._id}`}
                        className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
                      >
                        {displayName(customer)}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {customer.billingAddress?.email || "—"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {customer.billingAddress?.phone && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium">
                            {customer.billingAddress.phone}
                          </span>
                        )}
                        {(customer.billingAddress?.city ||
                          customer.billingAddress?.country) && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium">
                            {location(customer)}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Joined {formatDate(customer.createdAt)}
                      </p>
                    </div>

                    <div className="flex-none">
                      <PopoverMenu
                        items={getMenuItems(customer)}
                        ariaLabel={`Actions for ${displayName(customer)}`}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {customers.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {totalCustomers}
              </span>{" "}
              customers
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{page}</span> /{" "}
                {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete customer"
        message={`Are you sure you want to delete "${deleteTarget ? displayName(deleteTarget) : "this customer"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
}
