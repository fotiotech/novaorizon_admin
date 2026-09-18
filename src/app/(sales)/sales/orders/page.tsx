// app/sales/orders/page.tsx
"use client";

import {
  deleteOrder,
  findOrders,
  updateOrderStatus,
} from "@/app/actions/order";
import {
  Delete,
  FilterList,
  Visibility,
  Edit,
  MoreVert,
  SearchOff,
} from "@mui/icons-material";
import Link from "next/link";
import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { SkeletonLoader } from "./_component/SkeletonLoader";
import SearchFilter from "../../components/SearchFilter";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { Modal } from "@/components/ux/Modal";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "in transit"
  | "completed"
  | "return_requested"
  | "cancelled"
  | "returned";

type PaymentStatus =
  | "pending"
  | "cancelled"
  | "cod_pending"
  | "paid"
  | "failed"
  | "refunded";

interface FilterOptions {
  search: string;
  orderStatus: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}

/* ------------------------------------------------------------------ */
/* Module-scope styles + badges                                        */
/* ------------------------------------------------------------------ */
const statusStyles: Record<string, string> = {
  completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  processing:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  shipped:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20",
  "in transit":
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  cancelled:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  return_requested:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
  returned:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
};

const paymentStyles: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  cod_pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  pending:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
  failed:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  cancelled:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  refunded:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
};

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase() ?? "pending";
  const cls = statusStyles[key] ?? statusStyles.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status?.replace(/_/g, " ") || "pending"}
    </span>
  );
});

const PaymentBadge = memo(function PaymentBadge({
  status,
}: {
  status: string;
}) {
  const key = status?.toLowerCase() ?? "pending";
  const cls = paymentStyles[key] ?? paymentStyles.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status?.replace(/_/g, " ") || "pending"}
    </span>
  );
});

const EmptyState = memo(function EmptyState({
  hasActiveFilters,
}: {
  hasActiveFilters: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <SearchOff className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No orders found</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasActiveFilters
          ? "Try adjusting your filters."
          : "Orders will appear here once customers start buying."}
      </p>
    </div>
  );
});

function initials(order: any): string {
  const a = order?.firstName?.[0] ?? "";
  const b = order?.lastName?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const AllOrderPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteOrderNumber, setDeleteOrderNumber] = useState<string | null>(
    null,
  );

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusUpdateOrder, setStatusUpdateOrder] = useState<any | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] =
    useState<OrderStatus>("pending");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    orderStatus: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: "",
  });

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const limit = 10;

  const fetchOrders = useCallback(
    async (currentPage: number, currentFilters: FilterOptions) => {
      setLoading(true);
      try {
        const result = await findOrders({
          search: currentFilters.search || undefined,
          orderStatus: currentFilters.orderStatus || undefined,
          paymentStatus: currentFilters.paymentStatus || undefined,
          dateFrom: currentFilters.dateFrom
            ? new Date(currentFilters.dateFrom)
            : undefined,
          dateTo: currentFilters.dateTo
            ? new Date(currentFilters.dateTo)
            : undefined,
          page: currentPage,
          limit,
        });
        if (result && "orders" in result) {
          setOrders(result.orders as any[]);
          setTotalPages(result.totalPages || 1);
          setTotalOrders(result.total);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchOrders(page, filters);
  }, [page, filters, fetchOrders]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleDeleteClick = (orderNumber: string) => {
    setDeleteOrderNumber(orderNumber);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteOrderNumber) return;
    setDeletingId(deleteOrderNumber);
    const result = await deleteOrder(deleteOrderNumber);
    if (result) {
      fetchOrders(page, filters);
    } else {
      console.log("Failed to delete order or order not found.");
    }
    setDeletingId(null);
    setDeleteOrderNumber(null);
    setIsDeleteModalOpen(false);
  };

  const openStatusModal = (order: any) => {
    setStatusUpdateOrder(order);
    setSelectedNewStatus((order.orderStatus as OrderStatus) || "pending");
    setIsStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdateOrder || !selectedNewStatus) return;
    setUpdatingStatus(true);
    try {
      const result = await updateOrderStatus(statusUpdateOrder.orderNumber, {
        orderStatus: selectedNewStatus,
      });
      if (result.success) {
        fetchOrders(page, filters);
        setIsStatusModalOpen(false);
        setStatusUpdateOrder(null);
        setSelectedNewStatus("pending");
      } else {
        console.error("Failed to update status:", result.error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search.trim()) n++;
    if (filters.orderStatus) n++;
    if (filters.paymentStatus) n++;
    if (filters.dateFrom) n++;
    if (filters.dateTo) n++;
    return n;
  }, [filters]);

  const handleClearFilters = () => {
    setFilters({
      search: "",
      orderStatus: "",
      paymentStatus: "",
      dateFrom: "",
      dateTo: "",
    });
    setPage(1);
  };

  const getOrderMenuItems = (order: any): PopoverMenuItem[] => [
    {
      key: "view",
      label: "View details",
      icon: <Visibility fontSize="small" />,
      href: `/sales/orders/${order.orderNumber}`,
    },
    {
      key: "status",
      label: "Update status",
      icon: <Edit fontSize="small" />,
      onClick: () => openStatusModal(order),
    },
    {
      key: "delete",
      label: deletingId === order.orderNumber ? "Deleting…" : "Delete order",
      icon: <Delete fontSize="small" />,
      onClick: () => handleDeleteClick(order.orderNumber),
      danger: true,
      disabled: deletingId === order.orderNumber,
    },
  ];

  if (loading && orders.length === 0) {
    return <SkeletonLoader />;
  }

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="w-full max-w-7xl overflow-x-clip py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Orders
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage and track all incoming orders
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted md:hidden"
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

          <Link
            href="/orders/chat"
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:flex-initial"
          >
            Chats
          </Link>
        </div>
      </div>

      {/* Desktop filter bar */}
      <div className="hidden md:block">
        <SearchFilter
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search & Filters"
      >
        <div className="flex flex-col gap-4">
          <SearchFilter
            key={isMobileFiltersOpen ? "sheet-open" : "sheet-closed"}
            onFilterChange={handleFilterChange}
            initialFilters={filters}
          />
          <div className="flex items-center gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
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
      <div className="mt-6 min-w-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              All orders
            </h2>
            {totalOrders > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {totalOrders}
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
                <col style={{ width: "11%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Order
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Payment
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState hasActiveFilters={hasActiveFilters} />
                    </td>
                  </tr>
                ) : (
                  orders.map((order: any) => (
                    <tr
                      key={order._id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/sales/orders/${order.orderNumber}`}
                          className="block truncate font-medium text-foreground transition hover:text-primary"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                            {initials(order)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {order.firstName} {order.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {order.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="truncate font-medium text-foreground">
                          CFA {order.total?.toFixed(2) || "0.00"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="truncate">
                          <PaymentBadge status={order.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="truncate">
                          <StatusBadge status={order.orderStatus} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="truncate text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end">
                          <PopoverMenu
                            items={getOrderMenuItems(order)}
                            ariaLabel={`Actions for order ${order.orderNumber}`}
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
          {orders.length === 0 ? (
            <EmptyState hasActiveFilters={hasActiveFilters} />
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((order: any) => (
                <li key={order._id} className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/sales/orders/${order.orderNumber}`}
                          className="truncate font-medium text-foreground transition hover:text-primary"
                        >
                          #{order.orderNumber}
                        </Link>
                        <span className="shrink-0 text-sm font-semibold text-foreground">
                          CFA {order.total?.toFixed(2) || "0.00"}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                          {initials(order)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {order.firstName} {order.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {order.email}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={order.orderStatus} />
                        <PaymentBadge status={order.paymentStatus} />
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex-none">
                      <PopoverMenu
                        items={getOrderMenuItems(order)}
                        ariaLabel={`Actions for order ${order.orderNumber}`}
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
          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {orders.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{totalOrders}</span>{" "}
              orders
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{page}</span> /{" "}
                {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
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
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Order"
        message={`Are you sure you want to delete order #${deleteOrderNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger={true}
      />

      {/* Status update modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Order Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Order #{statusUpdateOrder?.orderNumber} — current status:{" "}
            <span className="font-medium text-foreground">
              {statusUpdateOrder?.orderStatus || "pending"}
            </span>
          </p>
          <div>
            <label
              htmlFor="status-select"
              className="block text-sm font-medium text-foreground"
            >
              New Status
            </label>
            <select
              id="status-select"
              value={selectedNewStatus}
              onChange={(e) =>
                setSelectedNewStatus(e.target.value as OrderStatus)
              }
              className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="in transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="return_requested">Return Requested</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={updatingStatus}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
              onClick={handleStatusUpdate}
              disabled={updatingStatus || !selectedNewStatus}
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllOrderPage;
