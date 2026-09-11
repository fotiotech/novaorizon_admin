// app/admin/messages/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getContactMessages,
  updateContactStatus,
  deleteContactMessage,
} from "@/app/actions/contact";
import Spinner from "@/components/Spinner";

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

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    read: "bg-yellow-100 text-yellow-800",
    replied: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
};

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
    fetchMessages();
  }, [fetchMessages]);

  const handleOpen = async (msg: ContactMessage) => {
    setSelected(msg);
    // Auto-mark as read if it was new
    if (msg.status === "new") {
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
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: ContactMessage["status"],
  ) => {
    setUpdating(true);
    const result = await updateContactStatus(id, newStatus);
    setUpdating(false);
    if (result.success) {
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, status: newStatus } : m)),
      );
      if (selected && selected._id === id) {
        setSelected({ ...selected, status: newStatus });
      }
      // Refresh counts
      fetchMessages();
    } else {
      alert(result.error || "Unable to update status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message permanently?")) return;
    const result = await deleteContactMessage(id);
    if (result.success) {
      setMessages((prev) => prev.filter((m) => m._id !== id));
      if (selected?._id === id) setSelected(null);
      fetchMessages();
    } else {
      alert(result.error || "Unable to delete message.");
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Contact Messages
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {total} message{total === 1 ? "" : "s"} found
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {STATUS_TABS.map((tab) => {
              const count = counts[tab.key] ?? 0;
              const isActive = status === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatus(tab.key);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, subject, or message…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="mt-10 flex justify-center">
            <Spinner />
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">No messages found.</p>
          </div>
        )}

        {/* Messages table */}
        {!loading && !error && messages.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      From
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {messages.map((msg) => (
                    <tr
                      key={msg._id}
                      className={`hover:bg-gray-50 ${
                        msg.status === "new" ? "font-medium" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{msg.name}</div>
                        <div className="text-xs text-gray-500">{msg.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="line-clamp-1">{msg.subject}</div>
                        <div className="line-clamp-1 text-xs text-gray-500">
                          {msg.message}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(
                            msg.status,
                          )}`}
                        >
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(msg.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpen(msg)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View
                        </button>
                        <span className="mx-2 text-gray-300">|</span>
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Message Details
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="px-6 py-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadge(
                    selected.status,
                  )}`}
                >
                  {selected.status}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(selected.createdAt)}
                </span>
              </div>

              {/* Sender */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  From
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {selected.name}
                </p>
                <a
                  href={`mailto:${selected.email}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selected.email}
                </a>
                {selected.phone && (
                  <p className="text-sm text-gray-600">
                    <a
                      href={`tel:${selected.phone}`}
                      className="hover:underline"
                    >
                      {selected.phone}
                    </a>
                  </p>
                )}
              </div>

              {/* Subject */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Subject
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {selected.subject}
                </p>
              </div>

              {/* Message */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Message
                </h3>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                  {selected.message}
                </p>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Actions
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent(
                      `Re: ${selected.subject}`,
                    )}`}
                    onClick={() => handleStatusChange(selected._id, "replied")}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Reply by Email
                  </a>
                  {selected.status !== "replied" && (
                    <button
                      onClick={() =>
                        handleStatusChange(selected._id, "replied")
                      }
                      disabled={updating}
                      className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
                    >
                      Mark as Replied
                    </button>
                  )}
                  {selected.status !== "archived" && (
                    <button
                      onClick={() =>
                        handleStatusChange(selected._id, "archived")
                      }
                      disabled={updating}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Archive
                    </button>
                  )}
                  {selected.status !== "new" && (
                    <button
                      onClick={() => handleStatusChange(selected._id, "new")}
                      disabled={updating}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Mark as New
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selected._id)}
                    className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessagesPage;
