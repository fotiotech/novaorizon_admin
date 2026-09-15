// app/sales/orders/page.tsx
"use client";

import {
  deleteOrder,
  findOrders,
  updateOrderStatus,
} from "@/app/actions/order";
import { Delete, FilterList } from "@mui/icons-material";
import Link from "next/link";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { SkeletonLoader } from "./_component/SkeletonLoader";
import SearchFilter from "../../components/SearchFilter";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { Modal } from "@/components/ux/Modal";
import { BottomSheet } from "@/components/ux/BottomSheet";

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

const AllOrderPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteOrderNumber, setDeleteOrderNumber] = useState<string | null>(
    null,
  );

  // Status update modal
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

  // Mobile bottom sheet
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

  // Delete handlers
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

  // Status update handlers
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

  // Active filter count for the mobile badge
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

  // Badge classes (unchanged)
  const getStatusBadgeClass = (status: string) => {
    const base =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status?.toLowerCase()) {
      case "completed":
        return `${base} bg-secondary/20 text-secondary-foreground dark:text-secondary`;
      case "processing":
      case "shipped":
        return `${base} bg-primary/20 text-primary-foreground dark:text-primary`;
      case "in transit":
        return `${base} bg-accent/20 text-accent-foreground dark:text-accent`;
      case "cancelled":
        return `${base} bg-destructive/20 text-destructive-foreground dark:text-destructive`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  const getPaymentBadgeClass = (status: string) => {
    const base =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status?.toLowerCase()) {
      case "paid":
        return `${base} bg-secondary/20 text-secondary-foreground dark:text-secondary`;
      case "refunded":
        return `${base} bg-accent/20 text-accent-foreground dark:text-accent`;
      case "failed":
      case "cancelled":
        return `${base} bg-destructive/20 text-destructive-foreground dark:text-destructive`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  if (loading && orders.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-3xl font-bold text-foreground">All Orders</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mobile-only: opens the bottom-sheet filter UI */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="md:hidden relative inline-flex items-center justify-center gap-2 flex-1 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-muted transition text-foreground"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Link
            href="/orders/chat"
            className="btn inline-flex items-center justify-center flex-1 sm:flex-initial"
          >
            Chats
          </Link>
        </div>
      </div>

      {/* Desktop-only inline filter bar */}
      <div className="hidden md:block">
        <SearchFilter
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />
      </div>

      {/* Mobile-only filter bottom sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search & Filters"
      >
        <div className="flex flex-col gap-4">
          {/*
            Remount on every open (via `key`) so the component's internal
            state re-initializes from the current `filters`, keeping
            desktop and mobile inputs in sync.
          */}
          <SearchFilter
            key={isMobileFiltersOpen ? "sheet-open" : "sheet-closed"}
            onFilterChange={handleFilterChange}
            initialFilters={filters}
          />

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-foreground">
            Orders {totalOrders > 0 && `(${totalOrders})`}
          </h3>
          {loading && (
            <span className="text-sm text-muted-foreground">Loading...</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-muted-foreground"
                  >
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">
                      #{order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      {order.firstName} {order.lastName}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {order.email}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      CFA {order.total?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={getPaymentBadgeClass(order.paymentStatus)}
                      >
                        {order.paymentStatus || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClass(order.orderStatus)}>
                        {order.orderStatus || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <Link
                        href={`/sales/orders/${order.orderNumber}`}
                        className="text-primary hover:text-primary/80 transition-colors text-sm"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => openStatusModal(order)}
                        className="text-foreground hover:text-foreground/80 transition-colors text-sm"
                      >
                        Update Status
                      </button>
                      <button
                        title="Delete Order"
                        type="button"
                        onClick={() => handleDeleteClick(order.orderNumber)}
                        disabled={deletingId === order.orderNumber}
                        className="text-destructive hover:text-destructive/80 disabled:opacity-50 text-sm"
                      >
                        <Delete fontSize="small" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {orders.length} of {totalOrders} orders
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition text-foreground"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition text-foreground"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
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

      {/* Status Update Modal */}
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
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={updatingStatus}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition disabled:opacity-50"
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
