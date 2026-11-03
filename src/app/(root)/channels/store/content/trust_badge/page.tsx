// app/(content)/content-management/trust-badges/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Add,
  ArrowBack,
  ArrowUpward,
  ArrowDownward,
  Delete,
  Edit,
  Refresh,
  Save,
} from "@mui/icons-material";
import { toast } from "react-hot-toast";
import {
  listTrustBadges,
  createTrustBadge,
  updateTrustBadge,
  deleteTrustBadge,
  reorderTrustBadges,
  type TrustBadgeDTO,
  type TrustBadgeInput,
} from "@/app/actions/trust_badge";
import { BADGE_ICON_OPTIONS } from "@/lib/trust/badgeIcons";
import TrustBadgeIcon from "@/components/TrustBadgeIcon";

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

const emptyInput: TrustBadgeInput = {
  name: "",
  icon: "shield-check",
  title: "",
  description: "",
  popupText: "",
  link: "",
  isActive: true,
};

type Mode = "list" | "create" | "edit";

export default function TrustBadgesPage() {
  const [badges, setBadges] = useState<TrustBadgeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrustBadgeInput>(emptyInput);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTrustBadges({ includeInactive: true });
      setBadges(data);
    } catch {
      toast.error("Failed to load badges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyInput);
  };

  const startEdit = (b: TrustBadgeDTO) => {
    setMode("edit");
    setEditingId(b._id);
    setForm({
      name: b.name,
      icon: b.icon,
      title: b.title,
      description: b.description,
      popupText: b.popupText,
      link: b.link,
      isActive: b.isActive,
      sortOrder: b.sortOrder,
    });
  };

  const backToList = () => {
    setMode("list");
    setEditingId(null);
    setForm(emptyInput);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await createTrustBadge(form);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("Badge created");
        backToList();
        await load();
      } else if (mode === "edit" && editingId) {
        const res = await updateTrustBadge(editingId, form);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(
          res.data.syncedHeroes > 0
            ? `Badge updated · ${res.data.syncedHeroes} hero${
                res.data.syncedHeroes === 1 ? "" : "es"
              } synced`
            : "Badge updated",
        );
        backToList();
        await load();
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (b: TrustBadgeDTO) => {
    const res = await updateTrustBadge(b._id, {
      ...b,
      isActive: !b.isActive,
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(b.isActive ? "Badge archived" : "Badge activated");
    await load();
  };

  const handleDelete = async (b: TrustBadgeDTO) => {
    const usage = b.usageCount ?? 0;
    if (usage > 0) {
      const ok = window.confirm(
        `This badge is used in ${usage} hero${
          usage === 1 ? "" : "es"
        }. Force delete? Heroes will keep the snapshot but lose the link.`,
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(`Delete "${b.title}"?`);
      if (!ok) return;
    }
    const res = await deleteTrustBadge(b._id, { force: usage > 0 });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Badge deleted");
    await load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= badges.length) return;
    const next = [...badges];
    [next[index], next[target]] = [next[target], next[index]];
    setBadges(next);
    const res = await reorderTrustBadges(next.map((b) => b._id));
    if (!res.success) toast.error(res.error);
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-clip">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {mode !== "list" && (
            <button
              type="button"
              onClick={backToList}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Back"
            >
              <ArrowBack sx={{ fontSize: 18 }} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {mode === "list"
                ? "Trust badges"
                : mode === "create"
                  ? "New badge"
                  : "Edit badge"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {mode === "list"
                ? "Reusable badges for heroes, checkout, product pages and more"
                : "Configure the badge content once — use everywhere"}
            </p>
          </div>
        </div>

        {mode === "list" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <Refresh sx={{ fontSize: 14 }} />
              Refresh
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Add sx={{ fontSize: 16 }} />
              New badge
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {mode === "list" &&
        (loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : badges.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground">No badges yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first badge to reuse it across the store.
            </p>
            <button
              type="button"
              onClick={startCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Add sx={{ fontSize: 16 }} />
              New badge
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {badges.map((b, i) => (
              <li
                key={b._id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrustBadgeIcon name={b.icon} size={18} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {b.title || "(untitled)"}
                    </p>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {b.name}
                    </span>
                    {b.isActive ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Archived
                      </span>
                    )}
                    {(b.usageCount ?? 0) > 0 && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
                        Used in {b.usageCount}
                      </span>
                    )}
                  </div>
                  {b.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {b.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => void move(i, -1)}
                    disabled={i === 0}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUpward sx={{ fontSize: 14 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(i, 1)}
                    disabled={i === badges.length - 1}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDownward sx={{ fontSize: 14 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(b)}
                    className="ml-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {b.isActive ? "Archive" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Edit sx={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(b)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Delete sx={{ fontSize: 16 }} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {/* Create / Edit form */}
      {(mode === "create" || mode === "edit") && (
        <form
          onSubmit={handleSave}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="space-y-3 border-b border-border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Internal name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={INPUT}
                  placeholder="Secure payment"
                  disabled={saving}
                  required
                />
              </Field>

              <Field label="Icon" required>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className={INPUT}
                  disabled={saving}
                >
                  {BADGE_ICON_OPTIONS.map((o: any) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Title" hint="customer-facing" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT}
                placeholder="Secure Payment"
                disabled={saving}
                required
              />
            </Field>

            <Field label="Description" hint="short line under the title">
              <input
                type="text"
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={INPUT}
                placeholder="SSL encrypted checkout"
                disabled={saving}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Popup text" hint="shown in a dialog when clicked">
                <textarea
                  rows={3}
                  value={form.popupText ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, popupText: e.target.value })
                  }
                  className={`${INPUT} resize-y`}
                  placeholder="We accept all major credit cards…"
                  disabled={saving}
                />
              </Field>

              <Field label="Link" hint="optional — URL or /path">
                <input
                  type="text"
                  value={form.link ?? ""}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className={INPUT}
                  placeholder="https://example.com or /return-policy"
                  disabled={saving}
                />
              </Field>
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-border bg-background/50 p-3">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                disabled={saving}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Inactive badges disappear from the picker but stay attached to
                  existing records.
                </p>
              </div>
            </label>

            {/* Live preview */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrustBadgeIcon name={form.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {form.title || "Preview title"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.description || "Preview description"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-4">
            <button
              type="button"
              onClick={backToList}
              disabled={saving}
              className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <Save sx={{ fontSize: 16 }} />
              )}
              {mode === "create" ? "Create badge" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {hint && (
          <span className="font-normal text-muted-foreground/70">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}
