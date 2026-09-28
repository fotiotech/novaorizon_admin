// app/analytics/inventory_reports/page.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import Link from "next/link";
import {
  Inventory2,
  CheckCircle,
  ErrorOutline,
  WarningAmber,
  ArrowForward,
  Refresh,
} from "@mui/icons-material";
import { getProductAnalytics } from "@/app/actions/analytic";

interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  productsByStatus: Record<string, number>;
  productsByCategory: Record<string, number>;
  monthlyAdditions: number[];
  recentProducts: any[];
}

const surfaceClass = "rounded-lg bg-card text-card-foreground";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  inactive: "bg-slate-500",
  draft: "bg-amber-500",
};

function formatMoney(n: number): string {
  return `CFA ${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  capitalize = true,
}: {
  data: { label: string; count: number; color: string }[];
  capitalize?: boolean;
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
              <span
                className={`font-medium text-foreground ${capitalize ? "capitalize" : ""}`}
              >
                {row.label}
              </span>
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
/*  Monthly column chart                                               */
/* ------------------------------------------------------------------ */
const MonthlyChart = memo(function MonthlyChart({
  values,
}: {
  values: number[];
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-1.5 px-4 pb-3 pt-4">
      {values.map((v, i) => {
        const heightPct = (v / max) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {v > 0 ? v : ""}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-primary/80 transition-all duration-500 hover:bg-primary"
                style={{
                  height: `${Math.max(heightPct, v > 0 ? 4 : 2)}%`,
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              {MONTHS[i]}
            </span>
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
      <div className="mt-4 rounded-lg bg-card">
        <div className="px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-40 p-4">
          <div className="h-full w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function InventoryReportsPage() {
  const [data, setData] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProductAnalytics();
      setData(result);
    } catch (err: any) {
      console.error("Failed to load product analytics:", err);
      setError(err?.message || "Failed to load inventory analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const statusRows = useMemo(() => {
    if (!data?.productsByStatus) return [];
    return Object.entries(data.productsByStatus)
      .map(([key, count]) => ({
        label: key,
        count: Number(count),
        color: STATUS_COLORS[key] ?? "bg-primary",
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const categoryRows = useMemo(() => {
    if (!data?.productsByCategory) return [];
    const palette = [
      "bg-primary",
      "bg-secondary-500",
      "bg-accent-500",
      "bg-violet-500",
      "bg-rose-500",
      "bg-emerald-500",
      "bg-indigo-500",
      "bg-amber-500",
    ];
    return Object.entries(data.productsByCategory)
      .map(([key, count], i) => ({
        label: key || "Uncategorized",
        count: Number(count),
        color: palette[i % palette.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  const healthPct = data?.totalProducts
    ? Math.round((data.activeProducts / data.totalProducts) * 100)
    : 0;

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
            label="Total products"
            value={(data?.totalProducts ?? 0).toLocaleString()}
            icon={<Inventory2 sx={{ fontSize: 18 }} />}
            iconClass="bg-primary/10 text-primary"
          />
          <StatCard
            label="Active"
            value={(data?.activeProducts ?? 0).toLocaleString()}
            hint={`${healthPct}% of catalog`}
            icon={<CheckCircle sx={{ fontSize: 18 }} />}
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Out of stock"
            value={(data?.outOfStock ?? 0).toLocaleString()}
            icon={<ErrorOutline sx={{ fontSize: 18 }} />}
            iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          <StatCard
            label="Low stock"
            value={(data?.lowStock ?? 0).toLocaleString()}
            hint="Quantity ≤ 1"
            icon={<WarningAmber sx={{ fontSize: 18 }} />}
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </section>

        {/* Monthly additions */}
        <section className={surfaceClass}>
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Monthly additions
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              New products added per month for the current year
            </p>
          </div>
          <MonthlyChart values={data?.monthlyAdditions ?? Array(12).fill(0)} />
        </section>

        {/* Two-column distributions */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className={surfaceClass}>
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                By status
              </h2>
            </div>
            <DistributionBar data={statusRows} />
          </section>

          <section className={surfaceClass}>
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                By category
              </h2>
              <Link
                href="/catalog/categories"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
              >
                Categories
                <ArrowForward sx={{ fontSize: 12 }} />
              </Link>
            </div>
            <DistributionBar data={categoryRows} capitalize={false} />
          </section>
        </div>

        {/* Recent products */}
        <section className={surfaceClass}>
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Recent products
            </h2>
            <Link
              href="/catalog/products"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
            >
              View all
              <ArrowForward sx={{ fontSize: 12 }} />
            </Link>
          </div>

          {data?.recentProducts?.length ? (
            <ul className="divide-y divide-border/60">
              {data.recentProducts.map((product: any) => {
                const qty = Number(product.quantity ?? 0);
                const threshold = Number(product.lowStockThreshold ?? 5);
                const badge =
                  qty === 0
                    ? {
                        label: "Out of stock",
                        cls: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
                      }
                    : qty <= threshold
                      ? {
                          label: "Low stock",
                          cls: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
                        }
                      : {
                          label: "In stock",
                          cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
                        };

                return (
                  <li
                    key={product._id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                      {product.mainImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.mainImage}
                          alt={product.name || "Product"}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Inventory2
                          fontSize="small"
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/catalog/products/edit/${product._id}`}
                        className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
                      >
                        {product.name || "Untitled"}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.category || "Uncategorized"}
                        {product.sku ? ` · ${product.sku}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badge.cls}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {badge.label}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        ({qty})
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(product.listPrice ?? product.price ?? 0)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No recent products.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
