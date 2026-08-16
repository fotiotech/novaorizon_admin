"use client";

import { getOrderAnalytics } from "@/app/actions/analytic";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useState, useEffect } from "react";
import Link from "next/link";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  recentOrders: any[];
}

export default function Order() {
  const [analytics, setAnalytics] = useState<OrderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const data = await getOrderAnalytics();
        setAnalytics(data);
      } catch (err) {
        setError("Failed to fetch analytics");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pri-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading order data...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );

  if (!analytics)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-muted-foreground">No data found</div>
      </div>
    );

  const statusChartData = {
    labels: Object.keys(analytics.ordersByStatus),
    datasets: [
      {
        label: "Orders by Status",
        data: Object.values(analytics.ordersByStatus),
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
        ],
      },
    ],
  };

  // Helper to get status badge color
  const getStatusBadgeClass = (status: string) => {
    const base =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status?.toLowerCase()) {
      case "completed":
        return `${base} bg-thir-500/20 text-thir-700 dark:text-thir-400`;
      case "processing":
        return `${base} bg-sec-500/20 text-sec-700 dark:text-sec-400`;
      case "cancelled":
        return `${base} bg-destructive/20 text-destructive`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  return (
    <div className=" space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        Order Analytics Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Total Orders
          </h2>
          <p className="text-3xl font-bold">{analytics.totalOrders}</p>
        </div>
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Total Revenue
          </h2>
          <p className="text-3xl font-bold">
            CFA {analytics.totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Average Order Value
          </h2>
          <p className="text-3xl font-bold">
            CFA {analytics.averageOrderValue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-semibold mb-4">Orders by Status</h2>
          <Doughnut data={statusChartData} />
        </div>
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-semibold mb-4">Revenue Analytics</h2>
          {/* Additional revenue charts can be added here */}
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {analytics.recentOrders.map((order: any) => (
                <tr key={order._id.toString()}>
                  <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">
                    #{order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-foreground">
                    {order.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-foreground">
                    CFA {order.total?.toFixed(2) || "0.00"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-foreground">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.paymentStatus === "paid"
                          ? "bg-thir-500/20 text-thir-700 dark:text-thir-400"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {order.paymentStatus || "pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(order.orderStatus)}>
                      {order.orderStatus || "pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/sales/orders/${order.orderNumber}`}
                      className="text-pri-500 hover:text-pri-600 transition-colors text-sm"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
