// app/sales/refunds/page.tsx
"use client";

import { findOrders, resolveReturnRequest } from "@/app/actions/order";
import { useEffect, useMemo, useState, memo } from "react";
import {
  Search,
  SearchOff,
  FilterList,
  Close,
  Check,
  Close as CloseIcon,
  Replay,
  MoreVert,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

// ------------------------------------------------------------------
// Status badge
// ------------------------------------------------------------------
const statusStyles: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  approved:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
};

const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const labels: Record<typeof status, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {labels[status]}
    </span>
  );
});

// ------------------------------------------------------------------
// Status resolution
// ------------------------------------------------------------------
function resolveStatus(item: any): "pending" | "approved" | "rejected" {
  if (item.paymentStatus === "refunded") return "approved";
  if (
    item.orderStatus === "completed" &&
    item.returnReason?.toLowerCase().includes("rejected")
  ) {
    return "rejected";
  }
  return "pending";
}

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------
const EmptyState = memo(function EmptyState({
  isFiltering,
}: {
  isFiltering: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isFiltering ? (
          <SearchOff className="text-muted-foreground" />
        ) : (
          <Replay className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No requests match your filters" : "No refund requests"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting your search or status filter."
          : "Return requests will appear here once customers ask for one."}
      </p>
    </div>
  );
});

export default function RefundsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    orderNumber: string;
    action: "approve" | "reject";
  } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const result = await findOrders({
        orderStatus: "return_requested",
        limit: 100,
      });
      setRequests(result.orders || []);
    } catch (error) {
      console.error("Failed to load return requests", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const visible = useMemo(() => {
    return requests.filter((item) => {
      const itemStatus = resolveStatus(item);
      const matchesStatus = status === "all" || status === itemStatus;
      const search =
        `${item.orderNumber} ${item.firstName} ${item.lastName} ${item.email}`.toLowerCase();
      return matchesStatus && search.includes(query.toLowerCase());
    });
  }, [requests, status, query]);

  const performAction = async (
    orderNumber: string,
    action: "approve" | "reject",
  ) => {
    setProcessingId(orderNumber);
    const toastId = toast.loading(
      action === "approve" ? "Approving refund…" : "Rejecting return…",
    );
    try {
      const result =
        action === "approve"
          ? await resolveReturnRequest(orderNumber, "approve")
          : await resolveReturnRequest(orderNumber, "reject", {
              reason: "Return rejected by admin review",
            });

      if (result.success) {
        toast.success(
          action === "approve"
            ? "Refund approved and stock restored."
            : "Return request rejected.",
          { id: toastId },
        );
        await fetchRequests();
      } else {
        toast.error(result.error || "Unable to process request", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong", { id: toastId });
    } finally {
      setProcessingId(null);
      setConfirmTarget(null);
    }
  };

  const getMenuItems = (item: any): PopoverMenuItem[] => {
    const isPending = item.orderStatus === "return_requested";
    const isBusy = processingId === item.orderNumber;

    if (!isPending) {
      return [
        {
          key: "handled",
          label: "Handled",
          icon: <Check fontSize="small" />,
          disabled: true,
          onClick: () => {},
        },
      ];
    }

    return [
      {
        key: "approve",
        label: isBusy ? "Processing…" : "Approve refund",
        icon: <Check fontSize="small" />,
        onClick: () =>
          setConfirmTarget({
            orderNumber: item.orderNumber,
            action: "approve",
          }),
        disabled: isBusy,
      },
      {
        key: "reject",
        label: "Reject return",
        icon: <CloseIcon fontSize="small" />,
        danger: true,
        onClick: () =>
          setConfirmTarget({ orderNumber: item.orderNumber, action: "reject" }),
        disabled: isBusy,
      },
    ];
  };

  const hasActiveFilters = query.trim() !== "" || status !== "all";
  const activeFilterCount =
    (query.trim() !== "" ? 1 : 0) + (status !== "all" ? 1 : 0);

  const handleClearFilters = () => {
    setQuery("");
    setStatus("all");
  };

  // ------------------------------------------------------------------
  // Search + status filter (reused in header row and mobile sheet)
  // ------------------------------------------------------------------
  const searchInputEl = (
    <div className="relative w-full">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by order, name, or email…"
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );

  const statusSelectEl = (
    <select
      value={status}
      onChange={(e) => setStatus(e.target.value as StatusFilter)}
      className={`${INPUT_CLASS} capitalize`}
    >
      <option value="all">All statuses</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
  );

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      {/* -------------------------------------------------------------- */}
      {/* Controls — no title (top bar renders the page name)            */}
      {/* -------------------------------------------------------------- */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
        {/* Mobile: Filters */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
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
        </div>

        {/* Desktop: search · status · clear */}
        <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          <div className="min-w-0 max-w-sm flex-1">{searchInputEl}</div>
          <div className="w-40 shrink-0">{statusSelectEl}</div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              aria-label="Clear filters"
              title="Clear filters"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Close fontSize="small" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search & Filters"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Search
            </label>
            {searchInputEl}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            {statusSelectEl}
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
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Refund requests
            </h2>
            {visible.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visible.length}
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
                <col style={{ width: "12%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Request
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Reason
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState isFiltering={hasActiveFilters} />
                    </td>
                  </tr>
                ) : (
                  visible.map((item) => {
                    const itemStatus = resolveStatus(item);
                    const isPending = itemStatus === "pending";
                    return (
                      <tr
                        key={item._id}
                        className="group transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <div className="truncate font-medium text-foreground">
                            #{item.orderNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.firstName} {item.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="truncate text-sm text-muted-foreground">
                            {new Date(
                              item.returnRequestedAt || item.createdAt,
                            ).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="truncate font-medium text-foreground">
                            {item.total} CFA
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={item.returnReason || "No reason provided"}
                          >
                            {item.returnReason || "No reason provided"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={itemStatus} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending ? (
                            <div className="flex justify-end">
                              <PopoverMenu
                                items={getMenuItems(item)}
                                ariaLabel={`Actions for order ${item.orderNumber}`}
                                trigger={<MoreVert fontSize="small" />}
                                align="right"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Handled
                            </span>
                          )}
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
          {visible.length === 0 ? (
            <EmptyState isFiltering={hasActiveFilters} />
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((item) => {
                const itemStatus = resolveStatus(item);
                const isPending = itemStatus === "pending";
                return (
                  <li key={item._id} className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-medium text-foreground">
                            #{item.orderNumber}
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-foreground">
                            {item.total} CFA
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-foreground">
                          {item.firstName} {item.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.email}
                        </p>

                        <p className="mt-2 truncate text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">
                            Reason:
                          </span>{" "}
                          {item.returnReason || "No reason provided"}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={itemStatus} />
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(
                              item.returnRequestedAt || item.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex-none">
                          <PopoverMenu
                            items={getMenuItems(item)}
                            ariaLabel={`Actions for order ${item.orderNumber}`}
                            trigger={<MoreVert fontSize="small" />}
                            align="right"
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Confirm dialog for approve / reject */}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => {
          if (!processingId) setConfirmTarget(null);
        }}
        onConfirm={() => {
          if (confirmTarget) {
            void performAction(confirmTarget.orderNumber, confirmTarget.action);
          }
        }}
        title={
          confirmTarget?.action === "approve"
            ? "Approve refund"
            : "Reject return"
        }
        message={
          confirmTarget?.action === "approve"
            ? `Approve refund for order #${confirmTarget?.orderNumber}? Stock will be restored and the customer will be refunded.`
            : `Reject the return request for order #${confirmTarget?.orderNumber}? The customer will be notified and no refund will be issued.`
        }
        confirmLabel={
          processingId
            ? "Processing…"
            : confirmTarget?.action === "approve"
              ? "Approve"
              : "Reject"
        }
        danger={confirmTarget?.action === "reject"}
      />
    </div>
  );
}
