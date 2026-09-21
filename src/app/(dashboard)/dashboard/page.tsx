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

/* Soft drop-shadow plugin so the ring lifts off the card. */
const softShadow = {
  id: "softShadow",
  beforeDatasetDraw(chart: ChartJS, args: { index: number }) {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
  },
  afterDatasetDraw(chart: ChartJS) {
    chart.ctx.restore();
  },
};

ChartJS.register(softShadow);

/* ------------------------------------------------------------------ */
/*  Chart options                                                      */
/* ------------------------------------------------------------------ */

const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "74%",
  radius: "92%",
  layout: { padding: 4 },
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
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function UserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function ProductIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function OrderIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  );
}

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
  size = 112,
}: DoughnutChartProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Doughnut data={data} options={doughnutOptions} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold leading-none text-foreground">
          {centerValue}
        </span>
        {centerLabel && (
          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
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

const surfaceClass =
  "rounded-2xl bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)]";

interface StatRow {
  label: string;
  value: string;
  tone?: "muted" | "positive" | "negative" | "accent";
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
    positive: "text-secondary-600 dark:text-secondary-400",
    negative: "text-destructive",
    accent: "text-accent-600 dark:text-accent-400",
  };

  return (
    <div className={`${surfaceClass} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}
          >
            {icon}
          </span>
          <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        </div>
        <Link
          href={href}
          className="text-xs font-medium text-primary hover:underline"
        >
          {hrefLabel} →
        </Link>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {primaryValue}
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-1.5">
                <dt
                  className={
                    row.tone && row.tone !== "muted"
                      ? toneClass[row.tone]
                      : "text-muted-foreground"
                  }
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
          hoverOffset: 6,
          borderWidth: 0,
          borderRadius: 8,
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
          hoverOffset: 6,
          borderWidth: 0,
          borderRadius: 8,
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
          hoverOffset: 6,
          borderWidth: 0,
          borderRadius: 8,
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-sm rounded-xl bg-destructive/10 p-5 text-center">
          <p className="font-semibold text-destructive">Something went wrong</p>
          <p className="mt-1 text-sm text-destructive/90">{error}</p>
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

  return (
    <div className="admin-page-shell">
      <div className="admin-page-gap mx-auto flex max-w-7xl flex-col">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your store&apos;s performance
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Users"
            href="/users"
            icon={<UserIcon />}
            iconClass="bg-primary/10 text-primary"
            primaryValue={(users?.total ?? 0).toLocaleString()}
            rows={[
              { value: `${users?.active ?? 0}`, label: "active" },
              {
                value: `+${users?.newThisMonth ?? 0}`,
                label: "this month",
                tone: "positive",
              },
            ]}
            chart={userChart}
            centerValue={`${activeUserPct}%`}
            centerLabel="active"
          />

          <StatCard
            title="Products"
            href="/products"
            icon={<ProductIcon />}
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
            href="/orders"
            icon={<OrderIcon />}
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
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-semibold text-foreground">Recent activity</h2>
            <Link
              href="/activity"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          {overviewData?.recentActivity?.length ? (
            <ul className="space-y-1 p-3">
              {overviewData.recentActivity.map((activity, index) => {
                const meta =
                  activity.type === "user"
                    ? {
                        Icon: UserIcon,
                        classes: "bg-primary/10 text-primary",
                      }
                    : activity.type === "product"
                      ? {
                          Icon: ProductIcon,
                          classes:
                            "bg-accent/10 text-accent-600 dark:text-accent-400",
                        }
                      : {
                          Icon: OrderIcon,
                          classes:
                            "bg-secondary/10 text-secondary-600 dark:text-secondary-400",
                        };
                const { Icon, classes } = meta;

                return (
                  <li
                    key={index}
                    className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${classes}`}
                    >
                      <Icon className="h-4 w-4" />
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
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              No recent activity.
            </p>
          )}
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              href: "/users",
              title: "Manage users",
              description: "View and manage user accounts",
              Icon: UserIcon,
              classes: "bg-primary/10 text-primary",
            },
            {
              href: "/products",
              title: "Manage products",
              description: "View and manage your inventory",
              Icon: ProductIcon,
              classes: "bg-accent/10 text-accent-600 dark:text-accent-400",
            },
            {
              href: "/orders",
              title: "Manage orders",
              description: "Review and process incoming orders",
              Icon: OrderIcon,
              classes:
                "bg-secondary/10 text-secondary-600 dark:text-secondary-400",
            },
          ].map(({ href, title, description, Icon, classes }) => (
            <Link
              key={href}
              href={href}
              className={`${surfaceClass} group flex items-center gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-16px_rgba(15,23,42,0.18)]`}
            >
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${classes}`}
              >
                <Icon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {description}
                </p>
              </div>
              <span className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
                →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
