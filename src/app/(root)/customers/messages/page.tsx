// app/admin/messages/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  getContactMessages,
  updateContactStatus,
  deleteContactMessage,
} from "@/app/actions/contact";
import {
  Search,
  SearchOff,
  Mail,
  Close,
  Reply,
  Archive,
  MarkEmailUnread,
  Delete,
  MoreVert,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  createdAt: string;
  updatedAt: string;
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "replied", label: "Replied" },
  { key: "archived", label: "Archived" },
];

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

// ------------------------------------------------------------------
// Status badge
// ------------------------------------------------------------------
const statusStyles: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  read: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  replied:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  archived:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
};

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const key = (status || "new").toLowerCase();
  const cls = statusStyles[key] ?? statusStyles.new;
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
});

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------
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
          <Mail className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No messages match your search" : "No messages yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Contact form submissions will appear here."}
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

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------
const AdminMessagesPage = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [updating, setUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContactMessages({
        status,
        search: debouncedSearch,
        page,
        limit: 10,
      });
      setMessages(data.messages as ContactMessage[]);
      setCounts(data.counts);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // -------- Open message (auto-mark as read) --------
  const handleOpen = async (msg: ContactMessage) => {
    setSelected(msg);
    if (msg.status !== "new") return;

    const result = await updateContactStatus(msg._id, "read");
    if (result.success) {
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, status: "read" } : m)),
      );
      setCounts((prev) => ({
        ...prev,
        new: Math.max(0, (prev.new || 0) - 1),
        read: (prev.read || 0) + 1,
      }));
      setSelected({ ...msg, status: "read" });
    }
  };

  // -------- Change status --------
  const handleStatusChange = async (
    id: string,
    newStatus: ContactMessage["status"],
  ) => {
    setUpdating(true);
    const toastId = toast.loading("Updating status…");
    try {
      const result = await updateContactStatus(id, newStatus);
      if (result.success) {
        toast.success(`Marked as ${newStatus}`, { id: toastId });
        setMessages((prev) =>
          prev.map((m) => (m._id === id ? { ...m, status: newStatus } : m)),
        );
        if (selected && selected._id === id) {
          setSelected({ ...selected, status: newStatus });
        }
        await fetchMessages();
      } else {
        toast.error(result.error || "Unable to update status", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Unable to update status", { id: toastId });
    } finally {
      setUpdating(false);
    }
  };

  // -------- Delete --------
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting message…");
    try {
      const result = await deleteContactMessage(deleteTarget._id);
      if (result.success) {
        toast.success("Message deleted", { id: toastId });
        setMessages((prev) => prev.filter((m) => m._id !== deleteTarget._id));
        if (selected?._id === deleteTarget._id) setSelected(null);
        setDeleteTarget(null);
        await fetchMessages();
      } else {
        toast.error(result.error || "Unable to delete message", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Unable to delete message", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isFiltering = debouncedSearch.trim() !== "";

  const getMenuItems = (msg: ContactMessage): PopoverMenuItem[] => [
    {
      key: "open",
      label: "View message",
      icon: <Mail fontSize="small" />,
      onClick: () => handleOpen(msg),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(msg),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      {/* ================================================================= */}
      {/* Controls row                                                       */}
      {/* ================================================================= */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            title="Clear search"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Close fontSize="small" />
          </button>
        )}
      </div>

      {/* ================================================================= */}
      {/* Status tabs                                                        */}
      {/* ================================================================= */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.key] ?? 0;
          const isActive = status === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* Error banner                                                       */}
      {/* ================================================================= */}
      {error && !loading && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>
            <strong className="font-medium">Error:</strong> {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="rounded p-0.5 transition hover:bg-destructive/10"
            aria-label="Dismiss error"
          >
            <Close fontSize="small" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* Card                                                               */}
      {/* ================================================================= */}
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {STATUS_TABS.find((t) => t.key === status)?.label ?? "All"}{" "}
              messages
            </h2>
            {total > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {total}
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
                <col style={{ width: "26%" }} />
                <col style={{ width: "40%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    From
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Subject
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && messages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16">
                      <div className="flex justify-center">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                      </div>
                    </td>
                  </tr>
                ) : messages.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        isFiltering={isFiltering}
                        onClear={() => setSearch("")}
                      />
                    </td>
                  </tr>
                ) : (
                  messages.map((msg) => (
                    <tr
                      key={msg._id}
                      className="group cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => handleOpen(msg)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary">
                            {(msg.name?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm ${
                                msg.status === "new"
                                  ? "font-semibold text-foreground"
                                  : "font-medium text-foreground/90"
                              }`}
                            >
                              {msg.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {msg.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-sm font-medium text-foreground">
                          {msg.subject || "(no subject)"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {msg.message}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={msg.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-xs text-muted-foreground">
                          {formatDate(msg.createdAt)}
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end">
                          <PopoverMenu
                            items={getMenuItems(msg)}
                            ariaLabel={`Actions for message from ${msg.name}`}
                            trigger={<MoreVert fontSize="small" />}
                            align="right"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------ MOBILE CARDS ----------------------- */}
        <div className="md:hidden">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center py-16">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              isFiltering={isFiltering}
              onClear={() => setSearch("")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((msg) => (
                <li
                  key={msg._id}
                  className="flex items-start gap-2 p-4 transition-colors hover:bg-muted/40"
                >
                  <button
                    type="button"
                    onClick={() => handleOpen(msg)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {(msg.name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-sm ${
                            msg.status === "new"
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/90"
                          }`}
                        >
                          {msg.name}
                        </p>
                        {msg.status === "new" && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {msg.email}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">
                        {msg.subject || "(no subject)"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {msg.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={msg.status} />
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex-none">
                    <PopoverMenu
                      items={getMenuItems(msg)}
                      ariaLabel={`Actions for message from ${msg.name}`}
                      trigger={<MoreVert fontSize="small" />}
                      align="right"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {messages.length}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span>{" "}
              messages
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{page}</span> /{" "}
                {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Detail drawer                                                      */}
      {/* ================================================================= */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-card text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Message details
                </h2>
                <StatusBadge status={selected.status} />
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Close fontSize="small" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Sender */}
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  From
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selected.name}
                </p>
                <a
                  href={`mailto:${selected.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {selected.email}
                </a>
                {selected.phone && (
                  <p className="text-sm text-muted-foreground">
                    <a
                      href={`tel:${selected.phone}`}
                      className="hover:underline"
                    >
                      {selected.phone}
                    </a>
                  </p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatDate(selected.createdAt)}
                </p>
              </div>

              {/* Subject */}
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Subject
                </p>
                <p className="text-sm font-medium text-foreground">
                  {selected.subject || "(no subject)"}
                </p>
              </div>

              {/* Message */}
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Message
                </p>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-background/50 p-3 text-sm text-foreground">
                  {selected.message}
                </p>
              </div>
            </div>

            {/* Drawer actions */}
            <div className="border-t border-border bg-card px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Actions
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${selected.email}?subject=${encodeURIComponent(
                    `Re: ${selected.subject}`,
                  )}`}
                  onClick={() => handleStatusChange(selected._id, "replied")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Reply sx={{ fontSize: 14 }} />
                  Reply by email
                </a>
                {selected.status !== "replied" && (
                  <button
                    onClick={() => handleStatusChange(selected._id, "replied")}
                    disabled={updating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    <Reply sx={{ fontSize: 14 }} />
                    Mark replied
                  </button>
                )}
                {selected.status !== "archived" && (
                  <button
                    onClick={() => handleStatusChange(selected._id, "archived")}
                    disabled={updating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    <Archive sx={{ fontSize: 14 }} />
                    Archive
                  </button>
                )}
                {selected.status !== "new" && (
                  <button
                    onClick={() => handleStatusChange(selected._id, "new")}
                    disabled={updating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    <MarkEmailUnread sx={{ fontSize: 14 }} />
                    Mark as new
                  </button>
                )}
                <button
                  onClick={() => setDeleteTarget(selected)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/20"
                >
                  <Delete sx={{ fontSize: 14 }} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete message"
        message={`Delete the message from "${deleteTarget?.name || "this sender"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
};

export default AdminMessagesPage;
