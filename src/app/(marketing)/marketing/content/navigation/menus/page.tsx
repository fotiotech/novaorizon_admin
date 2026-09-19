"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getAllMenus, deleteMenu } from "@/app/actions/menu";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";

// ------------------------------------------------------------------
// Interfaces
// ------------------------------------------------------------------
interface Menu {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  collectionId?: string | { _id: string; name: string } | null;
  link?: string;
  location?: string;
  display: string;
  position?: string;
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
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

const getContentSource = (menu: Menu) => {
  if (menu.collectionId) {
    if (typeof menu.collectionId === "object" && menu.collectionId.name) {
      return `Collection: ${menu.collectionId.name}`;
    }
    return `Collection ID: ${menu.collectionId}`;
  }
  if (menu.link) {
    return `Link: ${menu.link}`;
  }
  return "—";
};

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
const MenuPage = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this menu?")) return;

    const index = menus.findIndex((m) => m._id === id);
    if (index === -1) return;
    const removed = menus[index];

    setDeleteLoading(id);
    setError(null);

    // Optimistic removal
    setMenus((prev) => prev.filter((menu) => menu._id !== id));

    try {
      const result = await deleteMenu(id);
      if (result.success) {
        setSuccess("Menu deleted successfully");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        // Restore at original position
        setMenus((prev) => {
          const copy = [...prev];
          copy.splice(index, 0, removed);
          return copy;
        });
        setError(result.error || "Failed to delete menu");
      }
    } catch (err) {
      setMenus((prev) => {
        const copy = [...prev];
        copy.splice(index, 0, removed);
        return copy;
      });
      setError("An unexpected error occurred");
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {/* Notifications */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menus</h1>
          <p className="text-muted-foreground mt-1">
            Manage navigation menus – each references a collection or a direct
            link
          </p>
        </div>
        <Link
          href="/marketing/content/navigation/menus/create"
          className="bg-primary px-4 py-2 rounded-lg text-primary-foreground hover:bg-primary/90 transition-colors flex items-center"
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

      {/* Table Container */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {menus.length === 0 ? (
          <div className="text-center py-12 px-4">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
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
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No menus
            </h3>
            <p className="mt-1 text-muted-foreground">
              Get started by creating a new menu.
            </p>
            <div className="mt-6">
              <Link
                href="/marketing/content/navigation/menus/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Add Menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell"
                  >
                    Order
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell"
                  >
                    Content Source
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell"
                  >
                    Location
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell"
                  >
                    Display
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-32"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {menus.map((menu) => (
                  <tr key={menu._id}>
                    {/* Name + thumbnail */}
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {menu.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={menu.image}
                            alt={menu.name}
                            className="w-8 h-8 rounded object-cover border border-border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted border border-border flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-4 h-4 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {menu.name}
                          </div>
                          {menu.sectionTitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              Section: {menu.sectionTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="text-sm text-foreground">
                        {menu.order}
                      </span>
                    </td>

                    <td className="px-3 py-4 hidden md:table-cell">
                      <div className="text-sm text-foreground truncate max-w-xs">
                        {getContentSource(menu)}
                      </div>
                    </td>

                    <td className="px-3 py-4 hidden lg:table-cell">
                      <span className="text-sm text-foreground">
                        {menu.location || "—"}
                      </span>
                    </td>

                    <td className="px-3 py-4 hidden xl:table-cell">
                      <div className="text-sm text-muted-foreground space-y-0.5 truncate max-w-[180px]">
                        <span>{menu.display}</span>
                        {menu.position && <span> | {menu.position}</span>}
                        {menu.columns && <span> | {menu.columns} col</span>}
                        {menu.isSticky && <span> | Sticky</span>}
                        {menu.backgroundColor && (
                          <span className="inline-flex items-center ml-1">
                            <span
                              className="inline-block w-3 h-3 rounded-full border border-border"
                              style={{ backgroundColor: menu.backgroundColor }}
                            />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-4 whitespace-nowrap text-sm text-muted-foreground hidden md:table-cell">
                      {formatDate(menu.createdAt ?? menu.created_at)}
                    </td>

                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/marketing/content/navigation/menus/edit?id=${menu._id}`}
                          className="text-primary hover:text-primary/80"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(menu._id)}
                          disabled={deleteLoading === menu._id}
                          className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80 disabled:opacity-50"
                        >
                          {deleteLoading === menu._id ? (
                            <>
                              <Spinner />
                              <span>Deleting…</span>
                            </>
                          ) : (
                            "Delete"
                          )}
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
