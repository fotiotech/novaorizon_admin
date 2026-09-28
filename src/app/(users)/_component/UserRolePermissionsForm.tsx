// components/UserRolePermissionsForm.tsx
"use client";

import { useState } from "react";
import { Shield, Person2, Save, Check, Close } from "@mui/icons-material";
import { updateUserRoleAndPermissions } from "@/app/actions/users";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Roles — must match the enum in models/User.ts
// ------------------------------------------------------------------
const ROLES: { value: string; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access to every part of the admin panel.",
  },
  {
    value: "seller",
    label: "Seller",
    description: "Manages products, orders, and inventory.",
  },
  {
    value: "support",
    label: "Support",
    description: "Handles customers, messages, and order inquiries.",
  },
  {
    value: "customer",
    label: "Customer",
    description: "Storefront access only — no admin panel access.",
  },
];

// ------------------------------------------------------------------
// Permissions — app-level grants layered on top of the role
// ------------------------------------------------------------------
const PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: "manage_users", label: "Manage users", group: "Users" },
  { key: "manage_products", label: "Manage products", group: "Catalog" },
  { key: "manage_categories", label: "Manage categories", group: "Catalog" },
  { key: "manage_orders", label: "Manage orders", group: "Sales" },
  { key: "manage_refunds", label: "Manage refunds", group: "Sales" },
  { key: "manage_content", label: "Manage content", group: "Marketing" },
  { key: "manage_settings", label: "Manage settings", group: "Settings" },
  { key: "view_reports", label: "View reports", group: "Analytics" },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface Props {
  userId?: string;
  initialUser?: UserData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UserRolePermissionsForm({
  userId,
  initialUser,
  onSuccess,
  onCancel,
}: Props) {
  const [role, setRole] = useState(initialUser?.role ?? "customer");
  const [permissions, setPermissions] = useState<string[]>(
    initialUser?.permissions ?? [],
  );
  const [saving, setSaving] = useState(false);

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Missing user id");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Updating role & permissions…");
    try {
      const result = await updateUserRoleAndPermissions(
        userId,
        role,
        permissions,
      );
      if (result.success) {
        toast.success("Role & permissions updated", { id: toastId });
        onSuccess?.();
      } else {
        toast.error(result.message || "Failed to update user", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by their `group` label
  const grouped = PERMISSIONS.reduce<Record<string, typeof PERMISSIONS>>(
    (acc, p) => {
      if (!acc[p.group]) acc[p.group] = [];
      acc[p.group].push(p);
      return acc;
    },
    {},
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User summary */}
      {initialUser && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
            {(initialUser.name || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {initialUser.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {initialUser.email}
            </p>
          </div>
        </div>
      )}

      {/* Role */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Shield sx={{ fontSize: 14 }} />
          Role
        </label>
        <div className="grid grid-cols-1 gap-2">
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                disabled={saving}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-background hover:border-primary/30 hover:bg-muted/40"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  }`}
                >
                  {active && <Check sx={{ fontSize: 10 }} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize text-foreground">
                    {r.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Permissions */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Person2 sx={{ fontSize: 14 }} />
          Permissions{" "}
          <span className="font-normal text-muted-foreground/70">
            (optional, layered on top of the role)
          </span>
        </label>

        <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group}
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {items.map((p) => {
                  const checked = permissions.includes(p.key);
                  return (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(p.key)}
                        disabled={saving}
                        className="h-4 w-4 rounded border-border accent-primary disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-foreground">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {permissions.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {permissions.length} permission
            {permissions.length === 1 ? "" : "s"} selected
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Close sx={{ fontSize: 14 }} />
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          ) : (
            <Save sx={{ fontSize: 16 }} />
          )}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
