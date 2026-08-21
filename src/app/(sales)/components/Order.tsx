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

  // Recent orders state
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

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
    try {
      // Use findOrders with a small limit and no filters, sorted by creation date desc
      // Note: assuming the API supports sorting. If not, we can sort client-side.
      const result = await findOrders({
        page: 1,
        limit: 5,
        // optional: add sort parameter if supported
      });
      // Sort by createdAt descending (most recent first)
      const sorted = (result.orders || []).sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentOrders(sorted);
    } catch (err) {
      console.error("Failed to fetch recent orders", err);
    } finally {
      setLoadingRecent(false);
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

      {/* Recent Orders Section */}
      <div className="bg-card p-6 rounded-lg shadow-md border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Orders</h2>
          <Link
            href="/sales/orders"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View All
          </Link>
        </div>
        {loadingRecent ? (
          <div className="text-muted-foreground">Loading recent orders...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-muted-foreground">No recent orders.</div>
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
                {recentOrders.map((order:any) => (
                  <tr key={order._id}>
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