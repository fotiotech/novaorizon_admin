// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOverviewData } from "@/app/actions/analytic";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
);

interface OverviewData {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growthRate: number;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
  orders: {
    total: number;
    completed: number;
    revenue: number;
    averageOrderValue: number;
  };
  recentActivity: {
    type: string;
    title: string;
    description: string;
    time: string;
  }[];
}

export default function AdminOverview() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        const data = await getOverviewData();
        setOverviewData(data);
      } catch (err) {
        console.error("Failed to fetch overview data:", err);
        setError("Failed to fetch overview data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchOverviewData();
  }, []);

  // Chart data (static colours are fine, but you can theme them if needed)
  const userStatusData = {
    labels: ["Active", "Inactive"],
    datasets: [
      {
        data: overviewData
          ? [
              overviewData.users.active,
              overviewData.users.total - overviewData.users.active,
            ]
          : [0, 0],
        backgroundColor: ["rgba(75, 192, 192, 0.7)", "rgba(255, 99, 132, 0.7)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const productStatusData = {
    labels: ["Active", "Out of Stock", "Low Stock"],
    datasets: [
      {
        data: overviewData
          ? [
              overviewData.products.active,
              overviewData.products.outOfStock,
              overviewData.products.lowStock,
            ]
          : [0, 0, 0],
        backgroundColor: [
          "rgba(75, 192, 192, 0.7)",
          "rgba(255, 99, 132, 0.7)",
          "rgba(255, 206, 86, 0.7)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(255, 206, 86, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const orderStatusData = {
    labels: ["Completed", "Pending"],
    datasets: [
      {
        data: overviewData
          ? [
              overviewData.orders.completed,
              overviewData.orders.total - overviewData.orders.completed,
            ]
          : [0, 0],
        backgroundColor: ["rgba(75, 192, 192, 0.7)", "rgba(255, 206, 86, 0.7)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 206, 86, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
    maintainAspectRatio: false,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mb-8">
          Overview of your store&apos;s performance
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Users Card */}
          <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Users
              </h2>
              <Link
                href="/users"
                className="text-primary-500 hover:text-primary-600 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {overviewData?.users.total || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {overviewData?.users.active || 0} active users
                </p>
                <p className="text-sm text-accent-600 mt-1">
                  +{overviewData?.users.newThisMonth || 0} this month
                </p>
              </div>
              <div className="w-20 h-20">
                <Doughnut data={userStatusData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Products Card */}
          <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Products
              </h2>
              <Link
                href="/products"
                className="text-primary-500 hover:text-primary-600 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {overviewData?.products.total || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {overviewData?.products.active || 0} active products
                </p>
                <p className="text-sm text-destructive mt-1">
                  {overviewData?.products.outOfStock || 0} out of stock
                </p>
              </div>
              <div className="w-20 h-20">
                <Doughnut data={productStatusData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Orders Card */}
          <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Orders
              </h2>
              <Link
                href="/orders"
                className="text-primary-500 hover:text-primary-600 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {overviewData?.orders.total || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  CFA {overviewData?.orders.revenue?.toFixed(2) || "0.00"}{" "}
                  revenue
                </p>
                <p className="text-sm text-accent-600 mt-1">
                  CFA{" "}
                  {overviewData?.orders.averageOrderValue?.toFixed(2) || "0.00"}{" "}
                  avg. order
                </p>
              </div>
              <div className="w-20 h-20">
                <Doughnut data={orderStatusData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border-border mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {overviewData?.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start p-4  border-border last:border-0"
              >
                <div
                  className={`rounded-full p-2 mr-4 ${
                    activity.type === "user"
                      ? "bg-primary-500/10 text-primary-500"
                      : activity.type === "product"
                        ? "bg-accent-500/10 text-accent-500"
                        : "bg-secondary-500/10 text-secondary-500"
                  }`}
                >
                  {activity.type === "user" && (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  )}
                  {activity.type === "product" && (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  )}
                  {activity.type === "order" && (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">
                    {activity.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/users"
            className="bg-card text-card-foreground p-6 rounded-lg shadow-md border-border hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="rounded-full bg-primary-500/10 text-primary-500 p-3 mr-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Manage Users</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage user accounts
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/products"
            className="bg-card text-card-foreground p-6 rounded-lg shadow-md border-border hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="rounded-full bg-accent-500/10 text-accent-500 p-3 mr-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Manage Products
                </h3>
                <p className="text-sm text-muted-foreground">
                  View and manage product inventory
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/orders"
            className="bg-card text-card-foreground p-6 rounded-lg shadow-md border-border hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="rounded-full bg-secondary-500/10 text-secondary-500 p-3 mr-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Manage Orders</h3>
                <p className="text-sm text-muted-foreground">
                  View and process orders
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
