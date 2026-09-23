// app/analytics/sales_reports/page.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import Link from "next/link";
import {
  Assessment,
  ShoppingBag,
  Paid,
  TrendingUp,
  CheckCircle,
  ArrowForward,
  Replay,
  LocalShipping,
  Close,
  Refresh,
} from "@mui/icons-material";
import { getOrderAnalytics } from "@/app/actions/analytic";
import { toast } from "react-hot-toast";

interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  recentOrders: any[];
}

const surfaceClass = "rounded-lg bg-card text-card-foreground";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  "in transit": "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  processing: "bg-blue-500",
  shipped: "bg-indigo-500",
  "in transit": "bg-violet-500",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-500",
  return_requested: "bg-orange-500",
  returned: "bg-slate-500",
};

function formatMoney(n: number): string {
  return `CFA ${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */
const StatCard = memo(function StatCard({
  label,
  value,
  hint,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className={`${surfaceClass} p-4`}>
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Distribution bar                                                   */
/* ------------------------------------------------------------------ */
const DistributionBar = memo(function DistributionBar({
  data,
}: {
  data: { label: string; count: number; color: string }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No data to display.
      </p>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {data.map((row) => {
        const pct = (row.count / total) * 100;
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.count} ({pct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${row.color} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */
const Skeleton = memo(function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-clip">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg bg-card p-4">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg bg-card">
            <div className="px-4 py-3">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="h-6 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SalesReportsPage() {
  const [data, setData] = useState<OrderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOrderAnalytics();
      setData(result);
    } catch (err: any) {
      console.error("Failed to load order analytics:", err);
      setError(err?.message || "Failed to load sales analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const statusRows = useMemo(() => {
    if (!data?.ordersByStatus) return [];
    return Object.entries(data.ordersByStatus)
      .map(([key, count]) => ({
        label: STATUS_LABELS[key] ?? key,
        count: Number(count),
        color: STATUS_COLORS[key] ?? "bg-primary",
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const completionPct = useMemo(() => {
    if (!data?.totalOrders) return 0;
    return Math.round(
      ((data.ordersByStatus?.completed ?? 0) / data.totalOrders) * 100,
    );
  }, [data]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-destructive/15 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/25"
          >
            <Refresh sx={{ fontSize: 16 }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-clip">
      <div className="flex flex-col gap-4">
        {/* Stat cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total orders"
            value={(data?.totalOrders ?? 0).toLocaleString()}
            icon={<ShoppingBag sx={{ fontSize: 18 }} />}
            iconClass="bg-primary/10 text-primary"
          />
          <StatCard
            label="Revenue"
            value={formatMoney(data?.totalRevenue ?? 0)}
            icon={<Paid sx={{ fontSize: 18 }} />}
            iconClass="bg-secondary/10 text-secondary-600 dark:text-secondary-400"
          />
          <StatCard
            label="Avg. order value"
            value={formatMoney(data?.averageOrderValue ?? 0)}
            icon={<Assessment sx={{ fontSize: 18 }} />}
            iconClass="bg-accent/10 text-accent-600 dark:text-accent-400"
          />
          <StatCard
            label="Completion rate"
            value={`${completionPct}%`}
            hint={`${data?.ordersByStatus?.completed ?? 0} completed`}
            icon={<CheckCircle sx={{ fontSize: 18 }} />}
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </section>

        {/* Orders by status */}
        <section className={surfaceClass}>
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Orders by status
            </h2>
            <Link
              href="/sales/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
            >
              View orders
              <ArrowForward sx={{ fontSize: 12 }} />
            </Link>
          </div>
          <DistributionBar data={statusRows} />
        </section>

        {/* Recent orders */}
        <section className={surfaceClass}>
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Recent orders
            </h2>
            <Link
              href="/sales/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
            >
              View all
              <ArrowForward sx={{ fontSize: 12 }} />
            </Link>
          </div>

          {data?.recentOrders?.length ? (
            <ul className="divide-y divide-border/60">
              {data.recentOrders.map((order: any) => {
                const statusKey = String(order.orderStatus ?? "").toLowerCase();
                return (
                  <li
                    key={order._id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShoppingBag sx={{ fontSize: 16 }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/sales/orders/${order.orderNumber}`}
                        className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
                      >
                        #{order.orderNumber}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.userId?.email || order.email || "Guest"} ·{" "}
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs capitalize text-muted-foreground">
                        {STATUS_LABELS[statusKey] ?? statusKey}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(order.total ?? 0)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No recent orders.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
