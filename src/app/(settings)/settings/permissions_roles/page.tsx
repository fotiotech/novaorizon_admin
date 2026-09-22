// app/users/permissions_roles/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  Search,
  SearchOff,
  Shield,
  Person2,
  Edit as EditIcon,
  Close,
  Refresh,
  MoreVert,
} from "@mui/icons-material";
import { findUsers } from "@/app/actions/users";
import { Modal } from "@/components/ux/Modal";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import UserRolePermissionsForm from "../users/_component/UserRolePermissionsForm";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface UserRow {
  _id: string;
  fullName?: string | null;
  name?: string | null;
  email?: string;
  role?: string;
  permissions?: string[];
  status?: string;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-primary/10 text-primary ring-primary/20",
  seller:
    "bg-secondary/10 text-secondary-600 dark:text-secondary-400 ring-secondary-600/20 dark:ring-secondary-500/20",
  support:
    "bg-accent/10 text-accent-600 dark:text-accent-400 ring-accent-600/20 dark:ring-accent-500/20",
  customer:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
};

function displayName(u: UserRow): string {
  return (u.fullName ?? u.name ?? "").trim() || "Unnamed user";
}

function initials(u: UserRow): string {
  const n = displayName(u);
  return n[0]?.toUpperCase() ?? "?";
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
const EmptyState = memo(function EmptyState({
  isFiltering,
  onClear,
}: {
  isFiltering: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isFiltering ? (
          <SearchOff className="text-muted-foreground" />
        ) : (
          <Shield className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No users match your search" : "No staff users yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Staff accounts with roles will appear here."}
      </p>
      {isFiltering && (
        <div className="mt-4">
          <button
            onClick={onClear}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */
const Skeleton = memo(function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="flex-1" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PermissionRolePage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await findUsers();
      setUsers(Array.isArray(data) ? (data as UserRow[]) : []);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setError(err?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Filter out pure customers — this page manages staff accounts.
  const staffUsers = useMemo(
    () => users.filter((u) => (u.role ?? "customer") !== "customer"),
    [users],
  );

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staffUsers;
    return staffUsers.filter((u) => {
      const haystack =
        `${displayName(u)} ${u.email ?? ""} ${u.role ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [staffUsers, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (user: UserRow): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit role & permissions",
      icon: <EditIcon fontSize="small" />,
      onClick: () => setEditTarget(user),
    },
  ];

  // ---------------- Early states ----------------
  if (loading && users.length === 0) return <Skeleton />;

  if (error && users.length === 0) {
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
      {/* Controls — no title (top bar renders the page name) */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or role…"
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>
        {isFiltering && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            title="Clear search"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Close fontSize="small" />
          </button>
        )}
      </div>

      {/* Card */}
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Staff accounts
            </h2>
            {visibleUsers.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visibleUsers.length}
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
                <col style={{ width: "28%" }} />
                <col style={{ width: "26%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "26%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Permissions
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        isFiltering={isFiltering}
                        onClear={() => setQuery("")}
                      />
                    </td>
                  </tr>
                ) : (
                  visibleUsers.map((user) => {
                    const roleKey = String(
                      user.role ?? "customer",
                    ).toLowerCase();
                    const perms = user.permissions ?? [];
                    return (
                      <tr
                        key={user._id}
                        className="group transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary">
                              {initials(user)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {displayName(user)}
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
                          {perms.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {perms.slice(0, 3).map((p) => (
                                <span
                                  key={p}
                                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {p.replace(/_/g, " ")}
                                </span>
                              ))}
                              {perms.length > 3 && (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  +{perms.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/70">
                              No extra permissions
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <PopoverMenu
                              items={getMenuItems(user)}
                              ariaLabel={`Actions for ${displayName(user)}`}
                              trigger={<MoreVert fontSize="small" />}
                              align="right"
                            />
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
          {visibleUsers.length === 0 ? (
            <EmptyState
              isFiltering={isFiltering}
              onClear={() => setQuery("")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {visibleUsers.map((user) => {
                const roleKey = String(user.role ?? "customer").toLowerCase();
                const perms = user.permissions ?? [];
                return (
                  <li key={user._id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                        {initials(user)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {displayName(user)}
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
                          <span className="text-[11px] text-muted-foreground">
                            {perms.length > 0
                              ? `${perms.length} permission${perms.length === 1 ? "" : "s"}`
                              : "No extra permissions"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditTarget(user)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                        >
                          <EditIcon sx={{ fontSize: 14 }} />
                          Edit role & permissions
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit role & permissions"
        size="md"
      >
        {editTarget && (
          <UserRolePermissionsForm
            userId={editTarget._id}
            initialUser={{
              _id: editTarget._id,
              name: displayName(editTarget),
              email: editTarget.email ?? "",
              role: editTarget.role ?? "customer",
              permissions: editTarget.permissions ?? [],
            }}
            onSuccess={() => {
              setEditTarget(null);
              void load();
            }}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}
