"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteCategoryCollection } from "@/app/actions/categoryCollection";
import Notification from "@/components/Notification";
import Spinner from "@/components/Spinner";

type Collection = {
  _id: string;
  name: string;
  description?: string;
  type: "rule" | "manual" | "recommendation" | "related";
  status: "active" | "inactive";
  order: number;
  showName: boolean;
  recommendationType?: string;
  recommendationLimit?: number;
};

type Row = {
  collection: Collection;
  items: any[];
  itemCount: number;
  requiresCategoryContext: boolean;
};

const TYPE_BADGE: Record<Collection["type"], string> = {
  rule: "bg-blue-100 text-blue-700",
  manual: "bg-purple-100 text-purple-700",
  recommendation: "bg-green-100 text-green-700",
  related: "bg-amber-100 text-amber-700",
};

export default function CollectionList({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete category collection "${name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    setError(null);
    const result = await deleteCategoryCollection(id);
    setDeletingId(null);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Failed to delete collection");
    }
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg shadow">
        <p className="text-gray-500 mb-4">No category collections yet.</p>
        <Link
          href="/catalog/categories/collections/new"
          className="inline-block bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-blue-700"
        >
          Create your first collection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Notification
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const c = row.collection;
              return (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{c.name}</div>
                    {c.description && (
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${TYPE_BADGE[c.type]}`}
                    >
                      {c.type}
                    </span>
                    {c.type === "recommendation" && c.recommendationType && (
                      <div className="text-xs text-gray-500 mt-1">
                        {c.recommendationType}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        c.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {row.requiresCategoryContext ? (
                      <span className="text-gray-400">context-dependent</span>
                    ) : (
                      row.itemCount
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.order}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link
                        href={`/catalog/categories/collections/${c._id}/edit`}
                        className="text-sm px-3 py-1 border border-blue-500 text-blue-600 rounded hover:bg-blue-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(c._id, c.name)}
                        disabled={deletingId === c._id}
                        className="text-sm px-3 py-1 border border-red-500 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === c._id ? <Spinner /> : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
