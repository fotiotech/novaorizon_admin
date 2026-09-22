// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getOverviewData } from "@/app/actions/analytic";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import {
  Person2,
  Inventory2,
  ShoppingBag,
  ArrowForward,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";

ChartJS.register(ArcElement, Tooltip, Legend);

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

/* ------------------------------------------------------------------ */
/*  Theme helpers                                                      */
/* ------------------------------------------------------------------ */

function useThemeVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return version;
}

function hsl(token: string, alpha = 1) {
  if (typeof window === "undefined") return `hsl(0 0% 0% / ${alpha})`;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return raw ? `hsl(${raw} / ${alpha})` : `hsl(0 0% 0% / ${alpha})`;
}

/* ------------------------------------------------------------------ */
/*  Chart options                                                      */
/* ------------------------------------------------------------------ */

const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "74%",
  radius: "92%",
  layout: { padding: 2 },
  animation: {
    animateRotate: true,
    animateScale: false,
    duration: 700,
    easing: "easeOutQuart",
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "hsl(var(--popover))",
      titleColor: "hsl(var(--popover-foreground))",
      bodyColor: "hsl(var(--popover-foreground))",
      borderColor: "hsl(var(--border) / 0.6)",
      borderWidth: 1,
      padding: 10,
      cornerRadius: 10,
      boxPadding: 6,
      usePointStyle: true,
      titleFont: { size: 12, weight: 600 },
      bodyFont: { size: 12 },
      displayColors: true,
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Surface tokens                                                     */
/* ------------------------------------------------------------------ */

const surfaceClass =
  "rounded-lg border border-border bg-card text-card-foreground";

/* ------------------------------------------------------------------ */
/*  Chart wrapper with a centered value                                */
/* ------------------------------------------------------------------ */

interface DoughnutChartProps {
  data: ChartData<"doughnut">;
  centerValue: string;
  centerLabel?: string;
  size?: number;
}

function DoughnutChart({
  data,
  centerValue,
  centerLabel,
  size = 96,
}: DoughnutChartProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Doughnut data={data} options={doughnutOptions} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold leading-none text-foreground">
          {centerValue}
        </span>
        {centerLabel && (
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

interface StatRow {
  label: string;
  value: string;
  tone?: "muted" | "positive" | "negative" | "accent";
  trend?: "up" | "down";
}

interface StatCardProps {
  title: string;
  href: string;
  hrefLabel?: string;
  icon: React.ReactNode;
  iconClass: string;
  primaryValue: string;
  rows: StatRow[];
  chart: ChartData<"doughnut">;
  centerValue: string;
  centerLabel?: string;
}

function StatCard({
  title,
  href,
  hrefLabel = "View all",
  icon,
  iconClass,
  primaryValue,
  rows,
  chart,
  centerValue,
  centerLabel,
}: StatCardProps) {
  const toneClass: Record<NonNullable<StatRow["tone"]>, string> = {
    muted: "text-muted-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-rose-600 dark:text-rose-400",
    accent: "text-primary",
  };

  return (
    <div className={`${surfaceClass} p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
          >
            {icon}
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {title}
          </h2>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
        >
          {hrefLabel}
          <ArrowForward sx={{ fontSize: 12 }} />
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {primaryValue}
          </p>
          <dl className="mt-2 space-y-1 text-xs">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-1.5">
                {row.trend && (
                  <span
                    className={
                      row.trend === "up"
                        ? "inline-flex h-3 w-3 items-center justify-center text-emerald-600 dark:text-emerald-400"
                        : "inline-flex h-3 w-3 items-center justify-center text-rose-600 dark:text-rose-400"
                    }
                  >
                    {row.trend === "up" ? (
                      <ArrowUpward sx={{ fontSize: 11 }} />
                    ) : (
                      <ArrowDownward sx={{ fontSize: 11 }} />
                    )}
                  </span>
                )}
                <dt
                  className={`tabular-nums ${
                    row.tone && row.tone !== "muted"
                      ? toneClass[row.tone]
                      : "text-muted-foreground"
                  }`}
                >
                  {row.value}
                </dt>
                <dd className="truncate text-muted-foreground/80">
                  {row.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <DoughnutChart
          data={chart}
          centerValue={centerValue}
          centerLabel={centerLabel}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminOverview() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const themeVersion = useThemeVersion();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOverviewData();
        if (!cancelled) setOverviewData(data);
      } catch (err) {
        console.error("Failed to fetch overview data:", err);
        if (!cancelled) setError("Failed to fetch overview data");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- charts ---------- */

  const userChart = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: ["Active", "Inactive"],
      datasets: [
        {
          data: overviewData
            ? [
                overviewData.users.active,
                Math.max(
                  overviewData.users.total - overviewData.users.active,
                  0,
                ),
              ]
            : [1, 1],
          backgroundColor: [hsl("--primary", 0.9), hsl("--primary", 0.12)],
          hoverBackgroundColor: [hsl("--primary", 1), hsl("--primary", 0.18)],
          hoverOffset: 4,
          borderWidth: 0,
          borderRadius: 6,
          spacing: 2,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overviewData, themeVersion],
  );

  const productChart = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: ["Active", "Out of stock", "Low stock"],
      datasets: [
        {
          data: overviewData
            ? [
                overviewData.products.active,
                overviewData.products.outOfStock,
                overviewData.products.lowStock,
              ]
            : [1, 1, 1],
          backgroundColor: [
            hsl("--secondary", 0.9),
            hsl("--destructive", 0.85),
            hsl("--accent", 0.85),
          ],
          hoverBackgroundColor: [
            hsl("--secondary", 1),
            hsl("--destructive", 1),
            hsl("--accent", 1),
          ],
          hoverOffset: 4,
          borderWidth: 0,
          borderRadius: 6,
          spacing: 2,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overviewData, themeVersion],
  );

  const orderChart = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: ["Completed", "Pending"],
      datasets: [
        {
          data: overviewData
            ? [
                overviewData.orders.completed,
                Math.max(
                  overviewData.orders.total - overviewData.orders.completed,
                  0,
                ),
              ]
            : [1, 1],
          backgroundColor: [hsl("--primary", 0.9), hsl("--accent", 0.85)],
          hoverBackgroundColor: [hsl("--primary", 1), hsl("--accent", 1)],
          hoverOffset: 4,
          borderWidth: 0,
          borderRadius: 6,
          spacing: 2,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overviewData, themeVersion],
  );

  /* ---------- states ---------- */

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl overflow-x-clip">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-7 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-24 w-24 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card">
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const users = overviewData?.users;
  const products = overviewData?.products;
  const orders = overviewData?.orders;

  const activeUserPct = users?.total
    ? Math.round((users.active / users.total) * 100)
    : 0;
  const activeProductPct = products?.total
    ? Math.round((products.active / products.total) * 100)
    : 0;
  const completedOrderPct = orders?.total
    ? Math.round((orders.completed / orders.total) * 100)
    : 0;

  /* Quick action definitions */
  const quickActions = [
    {
      href: "/customers/customers",
      title: "Manage users",
      description: "View and manage user accounts",
      Icon: Person2,
      classes: "bg-primary/10 text-primary",
    },
    {
      href: "/catalog/products",
      title: "Manage products",
      description: "View and manage your inventory",
      Icon: Inventory2,
      classes: "bg-accent/10 text-accent-600 dark:text-accent-400",
    },
    {
      href: "/sales/orders",
      title: "Manage orders",
      description: "Review and process incoming orders",
      Icon: ShoppingBag,
      classes: "bg-secondary/10 text-secondary-600 dark:text-secondary-400",
    },
  ];

  /* Recent activity icon resolver */
  const activityMeta = (type: string) => {
    switch (type) {
      case "user":
        return {
          Icon: Person2,
          classes: "bg-primary/10 text-primary",
        };
      case "product":
        return {
          Icon: Inventory2,
          classes: "bg-accent/10 text-accent-600 dark:text-accent-400",
        };
      default:
        return {
          Icon: ShoppingBag,
          classes: "bg-secondary/10 text-secondary-600 dark:text-secondary-400",
        };
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      <div className="flex flex-col gap-4">
        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Users"
            href="/customers/customers"
            icon={<Person2 sx={{ fontSize: 18 }} />}
            iconClass="bg-primary/10 text-primary"
            primaryValue={(users?.total ?? 0).toLocaleString()}
            rows={[
              { value: `${users?.active ?? 0}`, label: "active" },
              {
                value: `+${users?.newThisMonth ?? 0}`,
                label: "this month",
                tone: "positive",
                trend: "up",
              },
            ]}
            chart={userChart}
            centerValue={`${activeUserPct}%`}
            centerLabel="active"
          />

          <StatCard
            title="Products"
            href="/catalog/products"
            icon={<Inventory2 sx={{ fontSize: 18 }} />}
            iconClass="bg-accent/10 text-accent-600 dark:text-accent-400"
            primaryValue={(products?.total ?? 0).toLocaleString()}
            rows={[
              { value: `${products?.active ?? 0}`, label: "active" },
              {
                value: `${products?.outOfStock ?? 0}`,
                label: "out of stock",
                tone: "negative",
              },
            ]}
            chart={productChart}
            centerValue={`${activeProductPct}%`}
            centerLabel="in stock"
          />

          <StatCard
            title="Orders"
            href="/sales/orders"
            icon={<ShoppingBag sx={{ fontSize: 18 }} />}
            iconClass="bg-secondary/10 text-secondary-600 dark:text-secondary-400"
            primaryValue={(orders?.total ?? 0).toLocaleString()}
            rows={[
              {
                value: `CFA ${(orders?.revenue ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                label: "revenue",
                tone: "accent",
              },
              {
                value: `CFA ${(orders?.averageOrderValue ?? 0).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}`,
                label: "avg. order",
              },
            ]}
            chart={orderChart}
            centerValue={`${completedOrderPct}%`}
            centerLabel="done"
          />
        </section>

        {/* Recent activity */}
        <section className={`${surfaceClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Recent activity
              </h2>
            </div>
            <Link
              href="/dashboard/notifications"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
            >
              View all
              <ArrowForward sx={{ fontSize: 12 }} />
            </Link>
          </div>

          {overviewData?.recentActivity?.length ? (
            <ul className="divide-y divide-border">
              {overviewData.recentActivity.map((activity, index) => {
                const { Icon, classes } = activityMeta(activity.type);
                return (
                  <li
                    key={index}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${classes}`}
                    >
                      <Icon sx={{ fontSize: 16 }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No recent activity.
            </p>
          )}
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickActions.map(({ href, title, description, Icon, classes }) => (
            <Link
              key={href}
              href={href}
              className={`${surfaceClass} group flex items-center gap-3 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40`}
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${classes}`}
              >
                <Icon sx={{ fontSize: 18 }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {description}
                </p>
              </div>
              <ArrowForward
                sx={{ fontSize: 16 }}
                className="shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
