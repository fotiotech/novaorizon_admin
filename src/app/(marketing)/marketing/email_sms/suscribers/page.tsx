// app/admin/newsletter/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getNewsletterSubscribers,
  deleteNewsletterSubscriber,
  exportNewsletterCsv,
} from "@/app/actions/newsletter";
import Spinner from "@/components/Spinner";

type Subscriber = {
  _id: string;
  email: string;
  status: "subscribed" | "unsubscribed" | "bounced";
  source: string;
  subscribedAt: string;
  unsubscribedAt?: string | null;
  createdAt: string;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "subscribed", label: "Subscribed" },
  { key: "unsubscribed", label: "Unsubscribed" },
  { key: "bounced", label: "Bounced" },
];

const badge = (status: string) => {
  const map: Record<string, string> = {
    subscribed: "bg-green-100 text-green-800",
    unsubscribed: "bg-gray-100 text-gray-700",
    bounced: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
};

export default function AdminNewsletterPage() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNewsletterSubscribers({
        status,
        search: debounced,
        page,
        limit: 20,
      });
      setSubs(data.subscribers as Subscriber[]);
      setCounts(data.counts);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to load subscribers.");
    } finally {
      setLoading(false);
    }
  }, [status, debounced, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this subscriber permanently?")) return;
    const res = await deleteNewsletterSubscriber(id);
    if (res.success) {
      setSubs((prev) => prev.filter((s) => s._id !== id));
      fetchData();
    } else alert(res.error || "Unable to delete.");
  };

  const handleExport = async () => {
    const res = await exportNewsletterCsv();
    if (!res.success || !res.csv) {
      alert(res.error || "Export failed.");
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Newsletter Subscribers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {total} subscriber{total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Export CSV
            </button>
            <Link
              href="/admin"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {TABS.map((tab) => {
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
          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

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

        {!loading && !error && subs.length === 0 && (
          <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">No subscribers found.</p>
          </div>
        )}

        {!loading && !error && subs.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Subscribed
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {subs.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{s.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badge(
                            s.status,
                          )}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.source}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(s.subscribedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
    </div>
  );
}
