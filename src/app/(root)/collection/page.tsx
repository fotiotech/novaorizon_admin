"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCollectionsWithProducts,
  deleteCollection,
} from "@/app/actions/collection";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";

const ProductCollectionPage = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set()
  );

  async function fetchCollections() {
    try {
      setLoading(true);
      const result = await getCollectionsWithProducts();
      if (result.success) {
        const mappedCollections = result.data || [];
        console.log({ mappedCollections });

        setCollections(mappedCollections);
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

    setDeleteLoading(id);
    setError(null);

    try {
      const collectionToDelete = collections.find(
        (c) => c.collection._id === id
      );
      setCollections((prev) => prev.filter((c) => c.collection._id !== id));

      const result = await deleteCollection(id);
      if (result.success) {
        setSuccess("Collection deleted successfully");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (collectionToDelete) {
          setCollections((prev) => [...prev, collectionToDelete]);
        }
        setError(result.error || "Failed to delete collection");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      await fetchCollections();
    } finally {
      setDeleteLoading(null);
    }
  };

  const toggleExpandCollection = (id: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCollections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to build hierarchical structure
  const buildCollectionTree = (collections: any[]) => {
    const collectionMap = new Map();
    const rootCollections: any = [];

    // First, map all collections by their ID
    collections.forEach((item) => {
      collectionMap.set(item.collection._id, { ...item, children: [] });
    });

    // Then, build the hierarchy
    collections.forEach((item) => {
      const parentId = item.collection.parent;
      if (parentId && collectionMap.has(parentId)) {
        collectionMap
          .get(parentId)
          .children.push(collectionMap.get(item.collection._id));
      } else {
        rootCollections.push(collectionMap.get(item.collection._id));
      }
    });

    return rootCollections;
  };

  // Recursive component to render collections hierarchy
  const CollectionTreeNode = ({
    node,
    level = 0,
  }: {
    node: any;
    level?: number;
  }) => {
    const { collection, products, productCount, children } = node;
    const isExpanded = expandedCollections.has(collection._id);
    const hasChildren = children && children.length > 0;

    return (
      <div className="mb-4">
        <div
          className="p-4 md:p-6 bg-white rounded-lg shadow-sm border border-gray-200"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {collection.name}
                    {level > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Child collection)
                      </span>
                    )}
                  </h3>
                  {collection.description && (
                    <p className="text-gray-600 mt-1 text-sm">
                      {collection.description}
                    </p>
                  )}
                </div>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    collection.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {collection.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {collection.display}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {productCount} products
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Updated {formatDate(collection.updated_at)}
                </span>
              </div>

              {products.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      Matching Products
                    </h4>
                    <button
                      onClick={() => toggleExpandCollection(collection._id)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? "Show less" : "Show all"}
                    </button>
                  </div>

                  <ul className="mt-2 space-y-1">
                    {(isExpanded ? products : products.slice(0, 3)).map(
                      (product: any) => (
                        <li
                          key={product._id}
                          className="text-sm text-gray-600 flex items-center"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                          {product.title || product.name}
                        </li>
                      )
                    )}
                  </ul>

                  {products.length > 3 && !isExpanded && (
                    <p className="text-xs text-gray-500 mt-1">
                      + {products.length - 3} more products
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Link
                href={`/collection/edit?id=${collection._id}`}
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
                onClick={() => handleDelete(collection._id)}
                disabled={deleteLoading === collection._id}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-75"
              >
                {deleteLoading === collection._id ? (
                  <>
                    <Spinner />
                    Deleting...
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

        {/* Render children if any */}
        {hasChildren && (
          <div className="mt-2">
            {children.map((child: any) => (
              <CollectionTreeNode
                key={child.collection._id}
                node={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Build the collection tree
  const collectionTree = buildCollectionTree(collections);

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
          <h1 className="text-2xl font-bold text-gray-800">
            Product Collections
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your product collections and their hierarchy
          </p>
        </div>
        <Link
          href="/collection/create"
          className="bg-blue-600 px-4 py-2 rounded-lg text-white hover:bg-blue-700 transition-colors flex items-center"
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
              Get started by creating a new product collection.
            </p>
            <div className="mt-6">
              <Link
                href="/collection/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Collection
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            {collectionTree.map((node: any) => (
              <CollectionTreeNode key={node.collection._id} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCollectionPage;
