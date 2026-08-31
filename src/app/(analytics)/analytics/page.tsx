"use client";

import { useEffect, useState } from "react";
import {
  getUserAnalytics,
  getOrderAnalytics,
  getProductAnalytics,
  getFacebookAdsAnalytics,
} from "@/app/actions/analytic";

type Metrics = {
  users?: any;
  orders?: any;
  products?: any;
  ads?: any;
};

function MetricCard({
  label,
  value,
  subtext,
  trend,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: { value: number; direction: "up" | "down" };
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      )}
      {trend && (
        <p
          className={`mt-2 text-xs font-medium ${
            trend.direction === "up" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
        </p>
      )}
    </div>
  );
}

function BarChart({
  data,
  height = 200,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-around gap-2" style={{ height }}>
      {data.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-2">
          <div
            className="rounded-t transition-colors hover:opacity-80"
            style={{
              width: 40,
              height: `${(item.value / maxValue) * height}px`,
              backgroundColor: item.color || "#3b82f6",
            }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({
  data,
  height = 200,
}: {
  data: number[];
  height?: number;
}) {
  const maxValue = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1 || 1)) * 100,
    y: ((maxValue - v) / maxValue) * 100,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg width="100%" height={height} className="mt-4">
      <polyline
        points={points
          .map((p) => `${(p.x / 100) * 500},${(p.y / 100) * height}`)
          .join(" ")}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    users: null,
    orders: null,
    products: null,
    ads: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [users, orders, products, ads] = await Promise.all([
          getUserAnalytics(),
          getOrderAnalytics(),
          getProductAnalytics(),
          getFacebookAdsAnalytics(),
        ]);

        setMetrics({ users, orders, products, ads });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Loading analytics data...</p>
      </main>
    );
  }

  const u = metrics.users || {};
  const o = metrics.orders || {};
  const p = metrics.products || {};
  const a = metrics.ads || {};

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your business metrics
        </p>
      </div>

      {/* Key Metrics Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Users"
          value={u.totalUsers || 0}
          subtext={`${u.activeUsers || 0} active`}
          trend={
            u.userGrowthRate
              ? { value: u.userGrowthRate, direction: "up" }
              : undefined
          }
        />
        <MetricCard
          label="Total Orders"
          value={o.totalOrders || 0}
          subtext={`Revenue: $${(o.totalRevenue || 0).toFixed(2)}`}
        />
        <MetricCard
          label="Total Products"
          value={p.totalProducts || 0}
          subtext={`${p.activeProducts || 0} active • ${p.outOfStock || 0} out of stock`}
        />
        <MetricCard
          label="Ad Spend (Meta)"
          value={`$${(a.totalSpend || 0).toFixed(2)}`}
          subtext={`ROI: ${(a.roi || 0).toFixed(1)}%`}
        />
      </section>

      {/* Revenue & Metrics Grid */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Order Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Average order value & completion rate
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Avg Order Value</span>
              <span className="font-semibold">
                ${(o.averageOrderValue || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Completed Orders</span>
              <span className="font-semibold">
                {o.ordersByStatus?.completed || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Conversion Rate</span>
              <span className="font-semibold">
                {(
                  ((o.ordersByStatus?.completed || 0) / (o.totalOrders || 1)) *
                    100 || 0
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Meta Ads Performance</h2>
          <p className="text-sm text-muted-foreground">
            Current campaign metrics
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Total Impressions</span>
              <span className="font-semibold">
                {(a.totalImpressions || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Clicks</span>
              <span className="font-semibold">
                {(a.totalClicks || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Cost Per Click</span>
              <span className="font-semibold">
                ${(a.avgCPC || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* User Growth & Product Status */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Monthly User Signups</h2>
          {u.monthlySignups && (
            <BarChart
              data={[
                {
                  label: "Jan",
                  value: u.monthlySignups[0] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Feb",
                  value: u.monthlySignups[1] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Mar",
                  value: u.monthlySignups[2] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Apr",
                  value: u.monthlySignups[3] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "May",
                  value: u.monthlySignups[4] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Jun",
                  value: u.monthlySignups[5] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Jul",
                  value: u.monthlySignups[6] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Aug",
                  value: u.monthlySignups[7] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Sep",
                  value: u.monthlySignups[8] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Oct",
                  value: u.monthlySignups[9] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Nov",
                  value: u.monthlySignups[10] || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Dec",
                  value: u.monthlySignups[11] || 0,
                  color: "#3b82f6",
                },
              ]}
            />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Product Status Breakdown
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Products</span>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 rounded bg-emerald-500" />
                <span className="font-semibold">
                  {p.productsByStatus?.active || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Inactive Products</span>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 rounded bg-slate-400" />
                <span className="font-semibold">
                  {p.productsByStatus?.inactive || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Draft Products</span>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 rounded bg-amber-400" />
                <span className="font-semibold">
                  {p.productsByStatus?.draft || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm">Out of Stock</span>
              <span className="font-semibold text-red-600">
                {p.outOfStock || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Low Stock</span>
              <span className="font-semibold text-amber-600">
                {p.lowStock || 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
          <div className="space-y-2">
            {u.recentUsers && u.recentUsers.length > 0 ? (
              u.recentUsers.map((user: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {user.joinDate}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent users</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Order Status Distribution
          </h2>
          <div className="space-y-3">
            {o.ordersByStatus ? (
              Object.entries(o.ordersByStatus).map(
                ([status, count]: [string, any]) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-amber-500",
                    processing: "bg-blue-500",
                    completed: "bg-emerald-500",
                    cancelled: "bg-red-500",
                    failed: "bg-red-600",
                  };
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm capitalize">{status}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-3 w-12 rounded ${statusColors[status] || "bg-gray-500"}`}
                        />
                        <span className="font-semibold">{count}</span>
                      </div>
                    </div>
                  );
                },
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                No order data available
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
