"use client";

import { useEffect, useState } from "react";
import { findOrders } from "@/app/actions/order";
import { getOrderAnalytics } from "@/app/actions/analytic";
import Link from "next/link";

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
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    orderStatus: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: "",
  });

  const limit = 10;

  // Fetch main orders (with filters & pagination)
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
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent orders (latest 5)
  const fetchRecentOrders = async () => {
    setLoadingRecent(true);
    setRecentError(null);
    try {
      const result = await findOrders({
        page: 1,
        limit: 5,
      });
      const sorted = (result.orders || []).sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setRecentOrders(sorted);
    } catch (err) {
      console.error("Failed to fetch recent orders", err);
      setRecentError("Could not load recent orders");
    } finally {
      setLoadingRecent(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const data = await getOrderAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setAnalyticsError("Could not load analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchRecentOrders();
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

  // Theme-aware badge classes
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

  // Skeleton for analytics cards
  const AnalyticsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card p-6 rounded-lg shadow-md border border-border animate-pulse"
        >
          <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-4 btn bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Order Management</h1>

      {/* Analytics Cards */}
      {loadingAnalytics ? (
        <AnalyticsSkeleton />
      ) : analyticsError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between">
          <span>{analyticsError}</span>
          <button
            onClick={fetchAnalytics}
            className="btn bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : (
        analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                Total Orders
              </h2>
              <p className="text-3xl font-bold text-foreground">
                {analytics.totalOrders}
              </p>
            </div>
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                Total Revenue
              </h2>
              <p className="text-3xl font-bold text-foreground">
                CFA {analytics.totalRevenue?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                Average Order Value
              </h2>
              <p className="text-3xl font-bold text-foreground">
                CFA {analytics.averageOrderValue?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        )
      )}

      {/* Recent Orders Section */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Recent Orders
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchRecentOrders}
              className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              disabled={loadingRecent}
            >
              <svg
                className={`w-4 h-4 ${loadingRecent ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <Link
              href="/sales/orders"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View All
            </Link>
          </div>
        </div>

        {loadingRecent ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center space-x-4"
              >
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-4 bg-muted rounded w-1/12"></div>
              </div>
            ))}
          </div>
        ) : recentError ? (
          <div className="text-destructive flex items-center justify-between">
            <span>{recentError}</span>
            <button
              onClick={fetchRecentOrders}
              className="text-primary hover:text-primary/80"
            >
              Retry
            </button>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">
            No recent orders found.
          </div>
        ) : (
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
                    Status
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
                {recentOrders.map((order: any) => (
                  <tr
                    key={order._id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">
                      #{order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      {order.firstName} {order.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      CFA {order.total?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClass(order.orderStatus)}>
                        {order.orderStatus || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/sales/orders/${order.orderNumber}`}
                        className="text-primary hover:text-primary/80 transition-colors text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
