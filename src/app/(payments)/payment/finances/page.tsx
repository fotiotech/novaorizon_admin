// app/(settings)/settings/finances/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Payments,
  TrendingUp,
  ShoppingBag,
  Assessment,
  Replay,
  Download,
  FilterList,
  Search,
  BarChart as BarChartIcon,
  ShowChart,
  Close,
  Refresh,
  Check,
  MoreVert,
} from "@mui/icons-material";
import {
  exportFinancialData,
  getChartData,
  getFinancialStats,
  getTransactions,
  updateTransactionStatus,
} from "@/app/actions/finance";
import type {
  FinancialStats,
  Transaction,
  ExpenseData,
  TransactionFilters,
} from "@/constant/types/finance";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Chart data — a single row has BOTH keys, so recharts can plot them
// ------------------------------------------------------------------
interface RevenuePoint {
  name: string;
  revenue: number;
  expenses: number;
  count?: number;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const surfaceClass =
  "rounded-lg border border-border bg-card text-card-foreground";

const STATUS_STYLES: Record<string, string> = {
  completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  failed:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  refunded:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "#a855f7",
  "#f43f5e",
  "#10b981",
  "#6366f1",
];

function formatMoney(n: number, symbol = "cfa"): string {
  return `${symbol} ${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso?: string | Date): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Theme helpers for recharts                                         */
/* ------------------------------------------------------------------ */
function themeColor(token: string, fallback = "#4f46e5") {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return raw ? `hsl(${raw})` : fallback;
}

function useThemeVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const o = new MutationObserver(() => setV((x) => x + 1));
    o.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => o.disconnect();
  }, []);
  return v;
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
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */
const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const key = (status || "pending").toLowerCase();
  const cls = STATUS_STYLES[key] ?? STATUS_STYLES.pending;
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
});

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */
const Skeleton = memo(function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-3">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-72 p-4">
              <div className="h-full w-full animate-pulse rounded bg-muted" />
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
export default function FinancePage() {
  const [timeRange, setTimeRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");
  const [chartSeries, setChartSeries] = useState<RevenuePoint[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    refunds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<TransactionFilters>({
    status: "all",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    status: "completed" | "refunded";
  } | null>(null);

  const themeVersion = useThemeVersion();

  // ---------- Debounced search ----------
  const runDebounced = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, 400);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    runDebounced(e.target.value);
  };

  const clearSearch = () => {
    setSearchInput("");
    runDebounced.cancel();
    setFilters((prev) => ({ ...prev, search: "" }));
  };

  // ---------- Fetch ----------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, txRes, chartRes] = await Promise.all([
        getFinancialStats(timeRange),
        getTransactions(filters, timeRange),
        getChartData(timeRange),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (txRes.success && txRes.data) setTransactions(txRes.data);

      if (chartRes.success && chartRes.data) {
        // Merge revenue + expenses into a single series that recharts
        // can plot. Both arrays are keyed by `name` (the bucket label).
        const revenues = chartRes.data.revenue ?? [];
        const expenses = chartRes.data.expenses ?? [];
        const expenseByName = new Map(
          expenses.map((e: any) => [e.name, Number(e.value ?? 0)]),
        );

        const merged: RevenuePoint[] = revenues.map((r: any) => ({
          name: r.name,
          revenue: Number(r.revenue ?? 0),
          expenses: expenseByName.get(r.name) ?? 0,
          count: Number(r.count ?? 0),
        }));

        // Any expense bucket that has no matching revenue bucket still
        // needs to appear, otherwise those bars vanish silently.
        const revenueNames = new Set(revenues.map((r: any) => r.name));
        for (const e of expenses) {
          if (!revenueNames.has(e.name)) {
            merged.push({
              name: e.name,
              revenue: 0,
              expenses: Number(e.value ?? 0),
            });
          }
        }

        setChartSeries(merged);
        setExpenseData(expenses);
      }
    } catch (err: any) {
      console.error("Failed to load financial data:", err);
      setError(err?.message || "Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }, [timeRange, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  // ---------- Export ----------
  const handleExport = async (format: "csv" | "json") => {
    const toastId = toast.loading("Preparing export…");
    try {
      const response = await exportFinancialData(format, timeRange, filters);

      let blob: Blob;
      let ext: string;

      if (typeof response === "string") {
        // CSV string
        blob = new Blob([response], { type: "text/csv;charset=utf-8" });
        ext = "csv";
      } else if (
        response &&
        (response as any).success &&
        (response as any).data
      ) {
        // JSON payload
        blob = new Blob([JSON.stringify((response as any).data, null, 2)], {
          type: "application/json",
        });
        ext = "json";
      } else {
        toast.error("Nothing to export", { id: toastId });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split("T")[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Export ready", { id: toastId });
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error(err?.message || "Failed to export", { id: toastId });
    }
  };

  // ---------- Update status ----------
  const confirmUpdateStatus = async () => {
    if (!confirmTarget) return;
    const { id, status } = confirmTarget;
    const toastId = toast.loading("Updating transaction…");
    try {
      const res = await updateTransactionStatus(id, status);
      if (res.success) {
        setTransactions((prev) =>
          prev.map((t) => (t._id === id ? { ...t, status } : t)),
        );
        toast.success(`Marked as ${status}`, { id: toastId });
        // Refresh stats
        const statsRes = await getFinancialStats(timeRange);
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
      } else {
        toast.error("Failed to update transaction", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update transaction", {
        id: toastId,
      });
    } finally {
      setConfirmTarget(null);
    }
  };

  const getTxMenuItems = (tx: Transaction): PopoverMenuItem[] => {
    const items: PopoverMenuItem[] = [];
    if (tx.status === "pending") {
      items.push({
        key: "approve",
        label: "Approve",
        icon: <Check fontSize="small" />,
        onClick: () => setConfirmTarget({ id: tx._id, status: "completed" }),
      });
    }
    if (tx.status !== "refunded" && tx.status !== "failed") {
      items.push({
        key: "refund",
        label: "Refund",
        icon: <Replay fontSize="small" />,
        danger: true,
        onClick: () => setConfirmTarget({ id: tx._id, status: "refunded" }),
      });
    }
    return items;
  };

  // ---------- Derived ----------
  const hasActiveFilters =
    (filters.status && filters.status !== "all") ||
    (filters.search && filters.search.trim() !== "");

  const gridColor = useMemo(
    () => themeColor("--border", "rgba(148,163,184,0.2)"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );
  const axisColor = useMemo(
    () => themeColor("--muted-foreground", "#64748b"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );
  const primaryColor = useMemo(
    () => themeColor("--primary", "#4f46e5"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );
  const destructiveColor = useMemo(
    () => themeColor("--destructive", "#ef4444"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );

  const tooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    color: "hsl(var(--popover-foreground))",
    fontSize: "12px",
  } as const;

  // ---------- Early states ----------
  if (loading && transactions.length === 0) return <Skeleton />;

  if (error && transactions.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/10"
          >
            <Refresh sx={{ fontSize: 16 }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      <div className="flex flex-col gap-4">
        {/* ---------------- Controls ---------------- */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative min-w-0 max-w-xs flex-1">
              <Search
                fontSize="small"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search transactions…"
                value={searchInput}
                onChange={handleSearchChange}
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value }))
              }
              className={`${INPUT_CLASS} w-36 shrink-0 capitalize`}
              title="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className={`${INPUT_CLASS} w-36 shrink-0`}
              title="Time range"
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="year">This year</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  setFilters({ status: "all", search: "" });
                }}
                aria-label="Clear filters"
                title="Clear filters"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Close fontSize="small" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Chart type toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setChartType("bar")}
                aria-pressed={chartType === "bar"}
                title="Bar chart"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
                  chartType === "bar"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChartIcon sx={{ fontSize: 16 }} />
              </button>
              <button
                type="button"
                onClick={() => setChartType("line")}
                aria-pressed={chartType === "line"}
                title="Line chart"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
                  chartType === "line"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShowChart sx={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Export */}
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Download sx={{ fontSize: 16 }} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => handleExport("json")}
              className="hidden shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:inline-flex"
            >
              <Download sx={{ fontSize: 16 }} />
              JSON
            </button>
          </div>
        </div>

        {/* ---------------- Stats ---------------- */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatMoney(stats.totalRevenue)}
            icon={<Payments sx={{ fontSize: 18 }} />}
            iconClass="bg-primary/10 text-primary"
          />
          <StatCard
            label="Orders"
            value={(stats.totalOrders ?? 0).toLocaleString()}
            icon={<ShoppingBag sx={{ fontSize: 18 }} />}
            iconClass="bg-secondary/10 text-secondary-600 dark:text-secondary-400"
          />
          <StatCard
            label="Avg. order value"
            value={formatMoney(stats.avgOrderValue)}
            icon={<Assessment sx={{ fontSize: 18 }} />}
            iconClass="bg-accent/10 text-accent-600 dark:text-accent-400"
          />
          <StatCard
            label="Refunds"
            value={formatMoney(stats.refunds)}
            icon={<Replay sx={{ fontSize: 18 }} />}
            iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </section>

        {/* ---------------- Charts ---------------- */}
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Revenue vs Expenses */}
          <div className={surfaceClass}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Revenue vs expenses
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {timeRange === "week"
                    ? "Last 7 days"
                    : timeRange === "month"
                      ? "Last 30 days"
                      : timeRange === "quarter"
                        ? "This quarter"
                        : "This year"}
                </p>
              </div>
            </div>
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="name"
                      stroke={axisColor}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={axisColor}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
                    <Bar
                      dataKey="revenue"
                      fill={primaryColor}
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      fill={destructiveColor}
                      name="Expenses"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <LineChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="name"
                      stroke={axisColor}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={axisColor}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={primaryColor}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke={destructiveColor}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Expenses"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense distribution */}
          <div className={surfaceClass}>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Expense distribution
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                By category
              </p>
            </div>
            <div className="h-72 p-4">
              {expenseData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No expense data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      innerRadius={50}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      label={({ name, percent }) =>
                        percent && percent > 0.05
                          ? `${name} ${(percent * 100).toFixed(0)}%`
                          : ""
                      }
                    >
                      {expenseData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => {
                        const numericValue = Array.isArray(value)
                          ? Number(value[0] ?? 0)
                          : Number(value ?? 0);

                        return [
                          formatMoney(
                            Number.isFinite(numericValue) ? numericValue : 0,
                          ),
                          "Amount",
                        ];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* ---------------- Transactions ---------------- */}
        <section className={surfaceClass}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Transactions
              </h2>
              {transactions.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {transactions.length}
                </span>
              )}
            </div>
            {loading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Loading…
              </span>
            )}
          </div>

          {/* ----------------------- DESKTOP TABLE ----------------------- */}
          <div className="hidden md:block">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[
                      "Order",
                      "Date",
                      "Customer",
                      "Amount",
                      "Method",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground ${
                          h === "Actions" ? "text-right" : "text-left"
                        }`}
                      >
                        {h === "Actions" ? (
                          <span className="sr-only">{h}</span>
                        ) : (
                          h
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Payments className="text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            No transactions found
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {hasActiveFilters
                              ? "Try adjusting or clearing your filters."
                              : "Transactions will appear here once orders are placed."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const customerName =
                        tx.userId?.name ?? (tx.userId as any)?.fullName ?? "—";
                      const menuItems = getTxMenuItems(tx);
                      return (
                        <tr
                          key={tx._id}
                          className="group transition-colors hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <div className="truncate font-mono text-xs text-foreground">
                              #{String(tx.orderId ?? "").slice(-8)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-xs text-muted-foreground">
                              {formatDate(tx.date)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-sm text-foreground">
                              {customerName}
                            </div>
                            {(tx.userId as any)?.email && (
                              <div className="truncate text-xs text-muted-foreground">
                                {(tx.userId as any).email}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-sm font-medium tabular-nums text-foreground">
                              {formatMoney(tx.amount)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-xs capitalize text-muted-foreground">
                              {tx.paymentMethod || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {menuItems.length > 0 ? (
                              <div className="flex justify-end">
                                <PopoverMenu
                                  items={menuItems}
                                  ariaLabel={`Actions for transaction ${tx._id}`}
                                  trigger={<MoreVert fontSize="small" />}
                                  align="right"
                                />
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------ MOBILE CARDS ----------------------- */}
          <div className="md:hidden">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Payments className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  No transactions found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "Try adjusting or clearing your filters."
                    : "Transactions will appear here once orders are placed."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {transactions.map((tx) => {
                  const customerName =
                    tx.userId?.name ?? (tx.userId as any)?.fullName ?? "—";
                  const menuItems = getTxMenuItems(tx);
                  return (
                    <li key={tx._id} className="flex items-start gap-2 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-mono text-xs text-foreground">
                            #{String(tx.orderId ?? "").slice(-8)}
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {formatMoney(tx.amount)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-foreground">
                          {customerName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(tx.date)} · {tx.paymentMethod || "—"}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <StatusBadge status={tx.status} />
                        </div>
                      </div>

                      {menuItems.length > 0 && (
                        <div className="flex-none">
                          <PopoverMenu
                            items={menuItems}
                            ariaLabel={`Actions for transaction ${tx._id}`}
                            trigger={<MoreVert fontSize="small" />}
                            align="right"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmUpdateStatus}
        title={
          confirmTarget?.status === "completed"
            ? "Approve transaction"
            : "Refund transaction"
        }
        message={
          confirmTarget?.status === "completed"
            ? "Mark this transaction as completed? This will reflect in revenue totals."
            : "Refund this transaction? The amount will be reversed and shown under refunds."
        }
        confirmLabel={
          confirmTarget?.status === "completed" ? "Approve" : "Refund"
        }
        danger={confirmTarget?.status === "refunded"}
      />
    </div>
  );
}
