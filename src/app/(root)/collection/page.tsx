"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getCollectionsWithProducts, deleteCollection } from "@/app/actions/collection";
import Image from "next/image";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";

const CollectionPage = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function fetchCollections() {
    const result = await getCollectionsWithProducts();
    if (result.success) {
      const mappedCollections = result.data || [];
      setCollections(mappedCollections);
    }
    setLoading(false);
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
      const collectionToDelete = collections.find((c) => c.collection._id === id);
      setCollections((prev) => prev.filter((c) => c.collection._id !== id));

      const result = await deleteCollection(id);
      if (result.success) {
        setSuccess("Collection deleted successfully");
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

  return (
    <div className="p-2 lg:p-4">
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Link
          href="/collection/create"
          className="bg-thiR px-4 py-2 rounded-lg text-white hover:bg-opacity-90"
        >
          Add Collection
        </Link>
      </div>

      <div className="border border-gray-600 rounded-lg shadow p-4">
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map(({ collection, products }) => (
              <div
                key={collection._id}
                className=" rounded-lg overflow-hidden group"
              >
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{collection.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {collection.description}
                  </p>
                  <div className="flex justify-between items-center mt-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        collection.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {collection.status === "active" ? "Active" : "Inactive"}
                    </span>
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/collection/edit?id=${collection._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(collection._id)}
                        className="text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={deleteLoading === collection._id}
                      >
                        {deleteLoading === collection._id ? (
                          <span className="flex items-center">
                            <Spinner />
                            <span className="ml-2">Deleting...</span>
                          </span>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </div>
                  </div>

                  {products.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Products:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {products.map((product: any) => (
                          <li key={product._id}>{product.identification_branding.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
