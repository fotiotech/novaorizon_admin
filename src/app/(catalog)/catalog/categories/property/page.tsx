"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCategoryProperty,
  deleteCategoryProperty,
} from "@/app/actions/category";

interface Property {
  _id: string;
  name: string;
  description?: string;
  sets?: any[];
  mappings?: any[];
  createdAt: string;
  updatedAt: string;
}

export default function CategoryPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await getCategoryProperty();
      setProperties(data || []);
    } catch (err) {
      setError("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    const result = await deleteCategoryProperty(id);
    if (result.success) {
      setProperties(properties.filter((p) => p._id !== id));
    } else {
      alert(result.error);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Category Properties</h1>
        <Link
          href="/catalog/categories/property/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <p className="text-gray-500">
          No properties found. Create your first one!
        </p>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mappings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {properties.map((prop) => (
                <tr key={prop._id}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{prop.name}</div>
                    {prop.description && (
                      <div className="text-sm text-gray-500">
                        {prop.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {prop.mappings?.length || prop.sets?.length || 0} sets
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/catalog/categories/property/${prop._id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(prop._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
