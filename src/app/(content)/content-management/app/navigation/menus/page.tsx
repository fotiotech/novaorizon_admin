"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getAllMenus, deleteMenu } from "@/app/actions/menu";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";

// ------------------------------------------------------------------
// Interfaces (matches your schema)
// ------------------------------------------------------------------
interface Menu {
  _id: string;
  name: string;
  description: string;
  content: string[]; // array of ObjectId strings
  populatedContent?: { _id: string; name: string }[]; // populated from action
  ctaUrl?: string;
  ctaText?: string;
  type: string; // "Home", "Category", "Product", etc.
  location?: string; // "Banner", "Header", "Section", "Footer"
  display?: string; // "List", "Grid", "Carousel", "Dropdown", "MegaMenu"
  position?: string; // "left", "center", "right", "full"
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

// ------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------
const formatMenuType = (type: string) => {
  const typeMap: Record<string, string> = {
    Home: "Home",
    Category: "Category",
    Product: "Product",
    Brand: "Brand",
    Collection: "Collection",
    Promotion: "Promotion",
    URL: "URL",
    Search: "Search",
    Page: "Page",
  };
  return typeMap[type] || type;
};

const getContentDisplay = (menu: Menu) => {
  if (menu.populatedContent && menu.populatedContent.length > 0) {
    return menu.populatedContent.map((item) => item.name).join(", ");
  }
  if (menu.content && menu.content.length > 0) {
    return `${menu.content.length} items`;
  }
  return "—";
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
    setDeleteLoading(id);
    setError(null);
    try {
      const result = await deleteMenu(id);
      if (result.success) {
        setSuccess("Menu deleted successfully");
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

      {/* Header with Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menus</h1>
          <p className="text-muted-foreground mt-1">
            Manage your navigation menus and their content links
          </p>
        </div>
        <Link
          href="/content-management/app/navigation/menus/create"
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
                href="/content-management/app/navigation/menus/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Add Menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border table-fixed">
              <thead className="bg-muted">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/5"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/6 hidden sm:table-cell"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/5 hidden md:table-cell"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/5 hidden lg:table-cell"
                  >
                    Content
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/5 hidden xl:table-cell"
                  >
                    Properties
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/6 hidden md:table-cell"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/6"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {menus.map((menu) => (
                  <tr key={menu._id}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-none">
                        {menu.name}
                      </div>
                      {menu.ctaText && (
                        <div className="text-xs text-muted-foreground truncate">
                          CTA: {menu.ctaText}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="text-sm text-foreground">
                        {formatMenuType(menu.type)}
                      </span>
                    </td>
                    <td className="px-3 py-4 hidden md:table-cell">
                      <div className="text-sm text-foreground truncate max-w-xs">
                        {menu.description || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-4 hidden lg:table-cell">
                      <div className="text-sm text-foreground truncate max-w-xs">
                        {getContentDisplay(menu)}
                      </div>
                    </td>
                    <td className="px-3 py-4 hidden xl:table-cell">
                      <div className="text-sm text-muted-foreground space-y-0.5 truncate max-w-[200px]">
                        {menu.location && <span>📍 {menu.location} </span>}
                        {menu.display && <span>Display: {menu.display} </span>}
                        {menu.columns && <span>Cols: {menu.columns} </span>}
                        {menu.isSticky && <span>Sticky </span>}
                        {menu.backgroundColor && (
                          <span className="inline-flex items-center">
                            <span
                              className="inline-block w-3 h-3 ml-1 rounded-full border border-border"
                              style={{ backgroundColor: menu.backgroundColor }}
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-muted-foreground hidden md:table-cell">
                      {formatDate(menu.createdAt)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/content-management/app/navigation/menus/edit?id=${menu._id}`}
                          className="text-primary hover:text-primary/80"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(menu._id)}
                          disabled={deleteLoading === menu._id}
                          className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                        >
                          {deleteLoading === menu._id ? "..." : "Delete"}
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
