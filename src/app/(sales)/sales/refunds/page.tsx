"use client";

import { findOrders, resolveReturnRequest } from "@/app/actions/order";
import { useEffect, useMemo, useState } from "react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function RefundsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const result = await findOrders({
        orderStatus: "return_requested",
        limit: 100,
      });
      setRequests(result.orders || []);
    } catch (error) {
      console.error("Failed to load return requests", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const visible = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus =
        status === "all" ||
        (status === "pending" && item.orderStatus === "return_requested") ||
        (status === "approved" && item.paymentStatus === "refunded") ||
        (status === "rejected" &&
          item.orderStatus === "completed" &&
          item.returnReason?.toLowerCase().includes("rejected"));

      const search =
        `${item.orderNumber} ${item.firstName} ${item.lastName} ${item.email}`.toLowerCase();
      return matchesStatus && search.includes(query.toLowerCase());
    });
  }, [requests, status, query]);

  const approve = async (orderNumber: string) => {
    setProcessingId(orderNumber);
    const result = await resolveReturnRequest(orderNumber, "approve");
    setProcessingId(null);
    if (result.success) {
      await fetchRequests();
      alert("Refund approved and stock restored.");
    } else {
      alert(result.error || "Unable to approve refund");
    }
  };

  const reject = async (orderNumber: string) => {
    setProcessingId(orderNumber);
    const result = await resolveReturnRequest(orderNumber, "reject", {
      reason: "Return rejected by admin review",
    });
    setProcessingId(null);
    if (result.success) {
      await fetchRequests();
      alert("Return request rejected.");
    } else {
      alert(result.error || "Unable to reject refund");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm text-slate-500">
              Sales / Returns & Refunds
            </p>
            <h1 className="text-3xl font-bold">Refunds & returns</h1>
            <p className="mt-2 text-slate-500">
              Review customer return requests and decide whether to approve or
              reject them.
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-semibold">Refund requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pending approval requests are listed here.
              </p>
            </div>
            <div className="flex gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search requests..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-slate-500">
              Loading return requests...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      {[
                        "Request",
                        "Customer",
                        "Date",
                        "Amount",
                        "Reason",
                        "Status",
                        "Action",
                      ].map((heading) => (
                        <th key={heading} className="px-5 py-3 font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <b>{item.orderNumber}</b>
                          <p className="text-xs text-slate-500">
                            Order request
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {item.firstName} {item.lastName}
                          <p className="text-xs text-slate-500">{item.email}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {new Date(
                            item.returnRequestedAt || item.createdAt,
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 font-medium">
                          {item.total} CFA
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {item.returnReason || "No reason provided"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.paymentStatus === "refunded"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.orderStatus === "completed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.paymentStatus === "refunded"
                              ? "Approved"
                              : item.orderStatus === "completed"
                                ? "Rejected"
                                : "Pending"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {item.orderStatus === "return_requested" ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => approve(item.orderNumber)}
                                disabled={processingId === item.orderNumber}
                                className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                              >
                                {processingId === item.orderNumber
                                  ? "Processing..."
                                  : "Approve"}
                              </button>
                              <button
                                onClick={() => reject(item.orderNumber)}
                                disabled={processingId === item.orderNumber}
                                className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Handled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!visible.length && (
                <p className="p-8 text-center text-sm text-slate-500">
                  No refund requests found.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
