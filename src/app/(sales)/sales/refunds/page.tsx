"use client";

import { useMemo, useState } from "react";

type Status = "Pending" | "Approved" | "Rejected";

const initialRequests = [
  {
    id: "RF-1048",
    order: "#NV-23891",
    customer: "Olivia Martin",
    date: "May 24, 2024",
    amount: "$129.00",
    reason: "Item arrived damaged",
    status: "Pending" as Status,
  },
  {
    id: "RF-1047",
    order: "#NV-23886",
    customer: "Ethan Williams",
    date: "May 23, 2024",
    amount: "$74.50",
    reason: "Wrong item received",
    status: "Approved" as Status,
  },
  {
    id: "RF-1046",
    order: "#NV-23874",
    customer: "Sophia Brown",
    date: "May 22, 2024",
    amount: "$216.00",
    reason: "No longer needed",
    status: "Pending" as Status,
  },
  {
    id: "RF-1045",
    order: "#NV-23861",
    customer: "Liam Davis",
    date: "May 21, 2024",
    amount: "$48.00",
    reason: "Item does not fit",
    status: "Rejected" as Status,
  },
];

export default function RefundsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      requests.filter(
        (item) =>
          (status === "All" || item.status === status) &&
          `${item.id} ${item.order} ${item.customer}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [requests, status, query],
  );

  const approve = (id: string) =>
    setRequests((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: "Approved" } : item,
      ),
    );

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm text-slate-500">
              Sales / Returns & refunds
            </p>
            <h1 className="text-3xl font-bold">Refunds & returns</h1>
            <p className="mt-2 text-slate-500">
              Review, manage, and track customer refund requests.
            </p>
          </div>
          <button className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700">
            + Create return
          </button>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total requests", "128", "+12% this month"],
            ["Pending review", "24", "Needs your attention"],
            ["Refunded this month", "$8,420", "+8.4% this month"],
            ["Return rate", "3.2%", "-0.6% from last month"],
          ].map(([label, value, note]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-emerald-600">{note}</p>
            </div>
          ))}
        </div>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-semibold">Refund requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage recent return and refund activity.
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
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option>All</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Request",
                    "Customer",
                    "Date",
                    "Amount",
                    "Reason",
                    "Status",
                    "",
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <b>{item.id}</b>
                      <p className="text-xs text-slate-500">
                        Order {item.order}
                      </p>
                    </td>
                    <td className="px-5 py-4">{item.customer}</td>
                    <td className="px-5 py-4 text-slate-500">{item.date}</td>
                    <td className="px-5 py-4 font-medium">{item.amount}</td>
                    <td className="px-5 py-4 text-slate-500">{item.reason}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Approved" ? "bg-emerald-100 text-emerald-700" : item.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {item.status === "Pending" ? (
                        <button
                          onClick={() => approve(item.id)}
                          className="font-medium text-indigo-600"
                        >
                          Approve
                        </button>
                      ) : (
                        <button className="font-medium text-indigo-600">
                          View
                        </button>
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
          <div className="border-t border-slate-200 p-5 text-sm text-slate-500">
            Showing {visible.length} of {requests.length} requests
          </div>
        </section>
      </div>
    </main>
  );
}
