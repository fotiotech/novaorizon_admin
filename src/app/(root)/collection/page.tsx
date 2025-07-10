"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getCollections, deleteCollection } from "@/app/actions/collection";
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
    const result = await getCollections();
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
      // Optimistic update
      const collectionToDelete = collections.find((c) => c.id === id);
      setCollections((prev) => prev.filter((c) => c.id !== id));

      const result = await deleteCollection(id);
      if (result.success) {
        setSuccess("Collection deleted successfully");
      } else {
        // Rollback on error
        if (collectionToDelete) {
          setCollections((prev) => [...prev, collectionToDelete]);
        }
        setError(result.error || "Failed to delete collection");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      // Refresh the list to ensure consistency
      await fetchCollections();
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="p-4">
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

      <div className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="border rounded-lg overflow-hidden group"
              >
                {collection.imageUrl && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={collection.imageUrl}
                      alt={collection.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{collection.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {collection.description}
                  </p>
                  <div className="flex justify-between items-center mt-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        collection.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {collection.isActive ? "Active" : "Inactive"}
                    </span>
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/collection/edit?id=${collection.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(collection.id!)}
                        className="text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={deleteLoading === collection.id}
                      >
                        {deleteLoading === collection.id ? (
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
