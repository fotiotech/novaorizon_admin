// app/sales/orders/page.tsx
"use client";

import { deleteOrder, findOrders } from "@/app/actions/order";

import { Prices } from "@/components/Prices";
import { Delete } from "@mui/icons-material";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import { SkeletonLoader } from "./_component/SkeletonLoader";
import { OrderStatusUpdater } from "../../components/OrderStatusUpdate";
import SearchFilter from "../../components/SearchFilter";

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

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    orderStatus: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: "",
  });

  const limit = 10;

  const fetchOrders = useCallback(
    async (currentPage: number, currentFilters: FilterOptions) => {
      setLoading(true);
      try {
        const result = await findOrders({
          search: currentFilters.search || undefined,
          orderStatus: currentFilters.orderStatus || undefined,
          paymentStatus: currentFilters.paymentStatus || undefined,
          dateFrom: currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : undefined,
          dateTo: currentFilters.dateTo ? new Date(currentFilters.dateTo) : undefined,
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
    setPage(1); // reset to first page when filters change
  };

  const handleDelete = async (orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete order #${orderNumber}?`)) {
      return;
    }
    setDeletingId(orderNumber);
    const result = await deleteOrder(orderNumber);
    if (result) {
      // Refetch current page after deletion
      fetchOrders(page, filters);
    } else {
      console.log("Failed to delete order or order not found.");
    }
    setDeletingId(null);
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status?.toLowerCase()) {
      case "completed":
        return `${base} bg-green/20 text-green-700 dark:text-green-400`;
      case "processing":
        return `${base} bg-blue/20 text-blue-700 dark:text-blue-400`;
      case "shipped":
        return `${base} bg-blue/20 text-blue-700 dark:text-blue-400`;
      case "in transit":
        return `${base} bg-orange/20 text-orange-700 dark:text-orange-400`;
      case "cancelled":
        return `${base} bg-destructive/20 text-destructive`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  const getPaymentBadgeClass = (status: string) => {
    const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status?.toLowerCase()) {
      case "paid":
        return `${base} bg-green/20 text-green-700 dark:text-green-400`;
      case "refunded":
        return `${base} bg-orange/20 text-orange-700 dark:text-orange-400`;
      case "failed":
      case "cancelled":
        return `${base} bg-destructive/20 text-destructive`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  if (loading && orders.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">All Orders</h2>
        <Link href="/orders/chat" className="btn">
          Chats
        </Link>
      </div>

      {/* Search & Filter */}
      <SearchFilter onFilterChange={handleFilterChange} initialFilters={filters} />

      {/* Orders Table */}
      <div className="bg-card p-6 rounded-lg shadow-md border border-border mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-foreground">
            Orders {totalOrders > 0 && `(${totalOrders})`}
          </h3>
          {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
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
                  <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order:any) => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">
                      #{order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      {order.firstName} {order.lastName}
                      <br />
                      <span className="text-xs text-muted-foreground">{order.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      CFA {order.total?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getPaymentBadgeClass(order.paymentStatus)}>
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
                      <OrderStatusUpdater orderNumber={order.orderNumber} />
                      <button
                        title="Delete Order"
                        type="button"
                        onClick={() => handleDelete(order.orderNumber)}
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
    </div>
  );
};

export default AllOrderPage;