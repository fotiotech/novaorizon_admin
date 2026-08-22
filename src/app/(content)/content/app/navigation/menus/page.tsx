"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getAllMenus, deleteMenu } from "@/app/actions/menu";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";

interface Menu {
  _id: string;
  name: string;
  description: string;
  collections: any[];
  ctaUrl: string;
  ctaText: string;
  type: string;
  position?: string;
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to format menu type for display
const formatMenuType = (type: string) => {
  const typeMap: Record<string, string> = {
    navigation: "Navigation",
    header: "Header",
    section: "Section",
    footer: "Footer",
    category: "Category",
    promotional: "Promotional",
  };
  return typeMap[type] || type;
};

const MenuPage = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all menus
  const fetchMenus = async () => {
    try {
      setLoading(true);
      const result = await getAllMenus();

      if (result.success) {
        setMenus(result.data || []);
      } else {
        setError(result.error || "Failed to fetch menus");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // Handle menu deletion
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this menu?")) {
      return;
    }

    setDeleteLoading(id);
    setError(null);

    try {
      const result = await deleteMenu(id);

      if (result.success) {
        setSuccess("Menu deleted successfully");
        // Remove the deleted menu from state
        setMenus((prev) => prev.filter((menu) => menu._id !== id));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to delete menu");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setDeleteLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex justify-center items-center min-h-64">
          <Spinner />
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-800">Menus</h1>
          <p className="text-gray-600 mt-1">
            Manage your navigation menus and their collections
          </p>
        </div>
        <Link
          href="/content_merchandising/menus/create"
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
          Add Menu
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {menus.length === 0 ? (
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No menus</h3>
            <p className="mt-1 text-gray-500">
              Get started by creating a new menu.
            </p>
            <div className="mt-6">
              <Link
                href="/content_merchandising/menus/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Collections
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Properties
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {menus.map((menu) => (
                  <tr key={menu._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {menu.name}
                      </div>
                      {menu.ctaText && (
                        <div className="text-sm text-gray-500">
                          CTA: {menu.ctaText}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatMenuType(menu.type)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {menu.description || "No description"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {menu.collections?.length || 0} collections
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {menu.type === "header" && menu.position && (
                          <div>Position: {menu.position}</div>
                        )}
                        {menu.type === "header" && menu.isSticky && (
                          <div>Sticky: Yes</div>
                        )}
                        {menu.type === "footer" && menu.columns && (
                          <div>Columns: {menu.columns}</div>
                        )}
                        {menu.type === "navigation" && menu.maxDepth && (
                          <div>Max Depth: {menu.maxDepth}</div>
                        )}
                        {menu.type === "category" && menu.showImages && (
                          <div>Show Images: Yes</div>
                        )}
                        {menu.type === "promotional" &&
                          menu.backgroundColor && (
                            <div className="flex items-center">
                              Color:
                              <span
                                className="inline-block w-4 h-4 ml-1 rounded-full border border-gray-300"
                                style={{
                                  backgroundColor: menu.backgroundColor,
                                }}
                              ></span>
                            </div>
                          )}
                        {menu.type === "section" && menu.sectionTitle && (
                          <div>Title: {menu.sectionTitle}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(menu.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/content_merchandising/menus/edit?id=${menu._id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(menu._id)}
                          disabled={deleteLoading === menu._id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deleteLoading === menu._id
                            ? "Deleting..."
                            : "Delete"}
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
    </div>
  );
};

export default MenuPage;
