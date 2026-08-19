"use client";

import { useEffect, useState } from "react";
import { findOrders } from "@/app/actions/order";
import { getOrderAnalytics } from "@/app/actions/analytic";
import SearchFilter from "./SearchFilter";
import Link from "next/link";
import { OrderStatusUpdater } from "./OrderStatusUpdate";

interface FilterOptions {
  search: string;
  orderStatus: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}

export default function Order() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    orderStatus: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: "",
  });

  const limit = 10;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await findOrders({
        search: filters.search || undefined,
        orderStatus: filters.orderStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        page: currentPage,
        limit,
      });
      setOrders(result.orders);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error(err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await getOrderAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filters, currentPage]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Order Management</h1>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-md border border-border">
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Total Orders
            </h2>
            <p className="text-3xl font-bold text-foreground">{analytics.totalOrders}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md border border-border">
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Total Revenue
            </h2>
            <p className="text-3xl font-bold text-foreground">
              CFA {analytics.totalRevenue?.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md border border-border">
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Average Order Value
            </h2>
            <p className="text-3xl font-bold text-foreground">
              CFA {analytics.averageOrderValue?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>
      )}

      <SearchFilter onFilterChange={handleFilterChange} initialFilters={filters} />

      <div className="bg-card p-6 rounded-lg shadow-md border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            All Orders {total > 0 && `(${total})`}
          </h2>
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
                orders.map((order) => (
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
              Showing {orders.length} of {total} orders
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition text-foreground"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
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
}