"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCollectionsWithProducts,
  deleteCollection,
} from "@/app/actions/collection";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";

// ------------------------------------------------------------------
// Labels
// ------------------------------------------------------------------
const TARGET_TYPE_PLURAL: Record<string, string> = {
  Category: "Categories",
  Product: "Products",
  Brand: "Brands",
  Collection: "Collections",
  Promotion: "Promotions",
  Page: "Pages",
};

const TARGET_TYPE_SINGULAR: Record<string, string> = {
  Category: "Category",
  Product: "Product",
  Brand: "Brand",
  Collection: "Collection",
  Promotion: "Promotion",
  Page: "Page",
};

const COLLECTION_TYPE_LABEL: Record<string, string> = {
  rule: "Rule-based",
  manual: "Manual",
  recommendation: "Recommendation",
  related: "Related products",
};

const getTargetTypeLabel = (targetType: string) =>
  TARGET_TYPE_PLURAL[targetType] || targetType;

const getTargetTypeSingular = (targetType: string) =>
  TARGET_TYPE_SINGULAR[targetType] || targetType;

const getCollectionTypeLabel = (type: string) =>
  COLLECTION_TYPE_LABEL[type] || type;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const getItemName = (item: any) => item.title || item.name || "Unnamed";

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Rule collections are pre-resolved at a hard cap of 50 in
// getCollectionsWithProducts(); flag when the cap was hit so the count
// badge is not misleading.
const RULE_ITEM_CAP = 50;

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
const ProductCollectionPage = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set(),
  );

  async function fetchCollections() {
    try {
      setLoading(true);
      const result = await getCollectionsWithProducts();
      if (result.success) {
        setCollections(result.data || []);
      } else {
        setError(result.error || "Failed to fetch collections");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this collection?")) {
      return;
    }

    const index = collections.findIndex((c) => c.collection._id === id);
    if (index === -1) return;
    const removed = collections[index];

    setDeleteLoading(id);
    setError(null);

    // Optimistic removal
    setCollections((prev) => prev.filter((c) => c.collection._id !== id));

    try {
      const result = await deleteCollection(id);
      if (result.success) {
        setSuccess("Collection deleted successfully");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        // Restore at original position
        setCollections((prev) => {
          const copy = [...prev];
          copy.splice(index, 0, removed);
          return copy;
        });
        setError(result.error || "Failed to delete collection");
      }
    } catch (err) {
      setCollections((prev) => {
        const copy = [...prev];
        copy.splice(index, 0, removed);
        return copy;
      });
      setError("An unexpected error occurred");
    } finally {
      setDeleteLoading(null);
    }
  };

  const toggleExpandCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 lg:p-6">
      {error && (
        <Notification
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <Notification
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Collections</h1>
          <p className="text-gray-600 mt-1">
            Manage collections of products, categories, brands, promotions,
            pages, or other collections
          </p>
        </div>
        <Link
          href="/marketing/content/navigation/collection/create"
          className="bg-primary px-4 py-2 rounded-lg text-white hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Collection
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <Spinner />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12 px-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No collections
            </h3>
            <p className="mt-1 text-gray-500">
              Get started by creating a new collection.
            </p>
            <div className="mt-6">
              <Link
                href="/marketing/content/navigation/collection/create"
                className="inline-flex items-center px-4 py-2 border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Collection
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {collections.map(
              ({ collection, items, itemCount, requiresProductContext }) => {
                const isRuleCapped =
                  collection.type === "rule" && itemCount >= RULE_ITEM_CAP;

                // Tolerate either camelCase or snake_case timestamps coming
                // from the server.
                const updatedAt = collection.updatedAt ?? collection.updated_at;

                const countLabel = isRuleCapped
                  ? `${RULE_ITEM_CAP}+ ${getTargetTypeLabel(
                      collection.targetType,
                    ).toLowerCase()}`
                  : `${itemCount} ${
                      itemCount === 1
                        ? getTargetTypeSingular(
                            collection.targetType,
                          ).toLowerCase()
                        : getTargetTypeLabel(
                            collection.targetType,
                          ).toLowerCase()
                    }`;

                return (
                  <div key={collection._id} className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {collection.name}
                            </h3>
                            {collection.description && (
                              <p className="text-gray-600 mt-1 text-sm">
                                {collection.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                collection.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {collection.status === "active"
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {getCollectionTypeLabel(collection.type)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {getTargetTypeLabel(collection.targetType)}
                          </span>

                          {requiresProductContext ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Requires product context
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {countLabel}
                            </span>
                          )}

                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Updated {formatDate(updatedAt)}
                          </span>
                        </div>

                        {items && items.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                {getTargetTypeLabel(collection.targetType)} in
                                this collection
                              </h4>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleExpandCollection(collection._id)
                                }
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {expandedCollections.has(collection._id)
                                  ? "Show less"
                                  : "Show all"}
                              </button>
                            </div>

                            <ul className="mt-2 space-y-1">
                              {(expandedCollections.has(collection._id)
                                ? items
                                : items.slice(0, 3)
                              ).map((item: any) => (
                                <li
                                  key={item._id}
                                  className="text-sm text-gray-600 flex items-center"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2" />
                                  {getItemName(item)}
                                </li>
                              ))}
                            </ul>

                            {items.length > 3 &&
                              !expandedCollections.has(collection._id) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  + {items.length - 3} more
                                </p>
                              )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Link
                          href={`/marketing/content/navigation/collection/edit/${collection._id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(collection._id)}
                          disabled={deleteLoading === collection._id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-75"
                        >
                          {deleteLoading === collection._id ? (
                            <>
                              <Spinner />
                              <span className="ml-1">Deleting…</span>
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCollectionPage;
