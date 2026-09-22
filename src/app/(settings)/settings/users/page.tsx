// app/dashboard/users/page.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import {
  Person2,
  CheckCircle,
  PersonAdd,
  TrendingUp,
  Search,
  SearchOff,
  Close,
  Refresh,
} from "@mui/icons-material";
import { getUserAnalytics } from "@/app/actions/analytic";
import type { UserAnalytics } from "@/constant/types/user";
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
import { Doughnut, Line } from "react-chartjs-2";

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

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const surfaceClass =
  "rounded-lg border border-border bg-card text-card-foreground";

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

const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  inactive:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
  suspended:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-primary/10 text-primary ring-primary/20",
  seller:
    "bg-secondary/10 text-secondary-600 dark:text-secondary-400 ring-secondary-600/20 dark:ring-secondary-500/20",
  support:
    "bg-accent/10 text-accent-600 dark:text-accent-400 ring-accent-600/20 dark:ring-accent-500/20",
  customer:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
};

function formatDate(iso?: string | null): string {
  if (!iso || iso === "Never") return iso ?? "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */
/*  Chart helpers                                                      */
/* ------------------------------------------------------------------ */

function hsl(token: string, alpha = 1) {
  if (typeof window === "undefined") return `hsl(0 0% 0% / ${alpha})`;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return raw ? `hsl(${raw} / ${alpha})` : `hsl(0 0% 0% / ${alpha})`;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        color: "hsl(var(--muted-foreground))",
        font: { size: 11 },
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        padding: 12,
      },
    },
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
    },
  },
} as const;

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
          <div key={i} className="rounded-lg border border-border bg-card">
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
export default function UserDashboard() {
  const [userData, setUserData] = useState<UserAnalytics | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserAnalytics();
      setUserData(data);
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError("Failed to fetch user data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // ---------- Filtered list ----------
  const filteredUsers = useMemo(() => {
    if (!userData?.recentUsers) return [];
    const q = searchQuery.trim().toLowerCase();
    return userData.recentUsers.filter((user: any) => {
      const matchesRole = selectedRole === "all" || user.role === selectedRole;
      const matchesStatus =
        selectedStatus === "all" || user.status === selectedStatus;
      if (!matchesRole || !matchesStatus) return false;
      if (!q) return true;
      const haystack =
        `${user.name ?? user.fullName ?? ""} ${user.email ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [userData, selectedRole, selectedStatus, searchQuery]);

  const isFiltering =
    searchQuery.trim() !== "" ||
    selectedRole !== "all" ||
    selectedStatus !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRole("all");
    setSelectedStatus("all");
  };

  // ---------- Charts ----------
  const statusChartData = useMemo(
    () => ({
      labels: userData ? Object.keys(userData.usersByStatus) : [],
      datasets: [
        {
          label: "Users by status",
          data: userData
            ? Object.values(userData.usersByStatus).map(Number)
            : [],
          backgroundColor: [
            hsl("--secondary", 0.85),
            hsl("--destructive", 0.85),
            hsl("--accent", 0.85),
            hsl("--primary", 0.85),
          ],
          borderWidth: 0,
          spacing: 2,
          borderRadius: 6,
        },
      ],
    }),
    [userData],
  );

  const monthlySignupsData = useMemo(
    () => ({
      labels: MONTHS,
      datasets: [
        {
          label: "Monthly signups",
          data: userData?.monthlySignups ?? Array(12).fill(0),
          fill: true,
          backgroundColor: hsl("--primary", 0.15),
          borderColor: hsl("--primary", 1),
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: hsl("--primary", 1),
          pointBorderColor: "hsl(var(--background))",
          pointBorderWidth: 2,
        },
      ],
    }),
    [userData],
  );

  // ---------- Early states ----------
  if (isLoading) return <Skeleton />;

  if (error) {
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

  const activeUserPct = userData?.totalUsers
    ? Math.round((userData.activeUsers / userData.totalUsers) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      <div className="flex flex-col gap-4">
        {/* ---------------- Stat cards ---------------- */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total users"
            value={(userData?.totalUsers ?? 0).toLocaleString()}
            icon={<Person2 sx={{ fontSize: 18 }} />}
            iconClass="bg-primary/10 text-primary"
          />
          <StatCard
            label="Active"
            value={(userData?.activeUsers ?? 0).toLocaleString()}
            hint={`${activeUserPct}% of total`}
            icon={<CheckCircle sx={{ fontSize: 18 }} />}
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="New this month"
            value={(userData?.newUsersThisMonth ?? 0).toLocaleString()}
            icon={<PersonAdd sx={{ fontSize: 18 }} />}
            iconClass="bg-accent/10 text-accent-600 dark:text-accent-400"
          />
          <StatCard
            label="Growth rate"
            value={`${(userData?.userGrowthRate ?? 0).toFixed(1)}%`}
            hint="vs. last month"
            icon={<TrendingUp sx={{ fontSize: 18 }} />}
            iconClass="bg-secondary/10 text-secondary-600 dark:text-secondary-400"
          />
        </section>

        {/* ---------------- Charts ---------------- */}
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className={surfaceClass}>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Users by status
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Breakdown of account status
              </p>
            </div>
            <div className="h-72 p-4">
              <Doughnut data={statusChartData} options={chartOptions} />
            </div>
          </div>

          <div className={surfaceClass}>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Monthly signups
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                New users per month for the current year
              </p>
            </div>
            <div className="h-72 p-4">
              <Line data={monthlySignupsData} options={chartOptions} />
            </div>
          </div>
        </section>

        {/* ---------------- Recent users ---------------- */}
        <section className={surfaceClass}>
          {/* Controls */}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Recent users
              </h2>
              {filteredUsers.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {filteredUsers.length}
                </span>
              )}
            </div>

            <div className="flex flex-1 items-center gap-2 md:justify-end">
              <div className="relative min-w-0 max-w-xs flex-1">
                <Search
                  fontSize="small"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT_CLASS} pl-9`}
                />
              </div>

              <select
                title="Filter by role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={`${INPUT_CLASS} w-32 shrink-0 capitalize`}
              >
                <option value="all">All roles</option>
                {userData &&
                  Object.keys(userData.usersByRole).map((role) => (
                    <option key={role} value={role} className="capitalize">
                      {role}
                    </option>
                  ))}
              </select>

              <select
                title="Filter by status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`${INPUT_CLASS} w-32 shrink-0 capitalize`}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>

              {isFiltering && (
                <button
                  type="button"
                  onClick={clearFilters}
                  aria-label="Clear filters"
                  title="Clear filters"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Close fontSize="small" />
                </button>
              )}
            </div>
          </div>

          {/* ----------------------- DESKTOP TABLE ----------------------- */}
          <div className="hidden md:block">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "11%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Joined
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Last active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            {isFiltering ? (
                              <SearchOff className="text-muted-foreground" />
                            ) : (
                              <Person2 className="text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {isFiltering
                              ? "No users match your filters"
                              : "No users yet"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {isFiltering
                              ? "Try adjusting or clearing your filters."
                              : "Users will appear here once they sign up."}
                          </p>
                          {isFiltering && (
                            <button
                              onClick={clearFilters}
                              className="mt-4 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user: any) => {
                      const displayName =
                        user.name ?? user.fullName ?? "Unnamed";
                      const initial = displayName[0]?.toUpperCase() ?? "?";
                      const statusKey = String(user.status ?? "").toLowerCase();
                      const roleKey = String(user.role ?? "").toLowerCase();
                      return (
                        <tr
                          key={user._id}
                          className="group transition-colors hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary">
                                {initial}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {displayName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-sm text-muted-foreground">
                              {user.email || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${
                                ROLE_STYLES[roleKey] ?? ROLE_STYLES.customer
                              }`}
                            >
                              {user.role || "customer"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${
                                STATUS_STYLES[statusKey] ??
                                STATUS_STYLES.pending
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              {user.status || "pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-xs text-muted-foreground">
                              {formatDate(user.joinDate)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-xs text-muted-foreground">
                              {formatDate(user.lastActive)}
                            </div>
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
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Person2 className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {isFiltering ? "No users match your filters" : "No users yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isFiltering
                    ? "Try adjusting or clearing your filters."
                    : "Users will appear here once they sign up."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredUsers.map((user: any) => {
                  const displayName = user.name ?? user.fullName ?? "Unnamed";
                  const initial = displayName[0]?.toUpperCase() ?? "?";
                  const statusKey = String(user.status ?? "").toLowerCase();
                  const roleKey = String(user.role ?? "").toLowerCase();
                  return (
                    <li key={user._id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {displayName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email || "—"}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${
                                ROLE_STYLES[roleKey] ?? ROLE_STYLES.customer
                              }`}
                            >
                              {user.role || "customer"}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${
                                STATUS_STYLES[statusKey] ??
                                STATUS_STYLES.pending
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              {user.status || "pending"}
                            </span>
                          </div>

                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Joined {formatDate(user.joinDate)} · Last active{" "}
                            {formatDate(user.lastActive)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
