"use client";

import React, { useEffect, useState } from "react";
import { getAllCustomers, deleteCustomer } from "@/app/actions/customer";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import { Search, Trash2, Eye } from "lucide-react";

interface Customer {
  _id: string;
  userId: string;
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    city?: string;
    country?: string;
  };
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const limit = 10;

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      const result = await getAllCustomers({
        page,
        limit,
        search: search || undefined,
      });
      if (result.success) {
        setCustomers(result.customers);
        setTotalPages(result.pages);
        setTotalCustomers(result.total);
      }
      setLoading(false);
    }

    fetchCustomers();
  }, [page, search]);

  const handleDelete = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    setDeleting(customerId);
    const result = await deleteCustomer(customerId);
    if (result.success) {
      setCustomers(customers.filter((c) => c._id !== customerId));
    } else {
      alert("Failed to delete customer");
    }
    setDeleting(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <div className="text-sm text-muted-foreground">
          Total: {totalCustomers} customers
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No customers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <tr
                    key={customer._id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {customer.billingAddress.firstName}{" "}
                      {customer.billingAddress.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {customer.billingAddress.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {customer.billingAddress.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {customer.billingAddress.city},{" "}
                      {customer.billingAddress.country}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/customers/customers/${customer._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(customer._id)}
                          disabled={deleting === customer._id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deleting === customer._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors text-sm"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded text-sm transition-colors ${
                  page === p
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
