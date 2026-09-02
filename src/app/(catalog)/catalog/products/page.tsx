"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { findProducts, deleteProduct } from "@/app/actions/products";
import { Delete } from "@mui/icons-material";
import { useDebouncedCallback } from "use-debounce";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { CircularProgress } from "@mui/material";

// Product type matches the actual schema
interface Product {
  _id: string;
  name: string;
  sku: string;
  slug: string;
  categoryId: { _id: string; name: string } | string | null;
  brand: { _id: string; name: string } | string | null;
  hasVariants: boolean;
  variantThemes: string[];
  variantValues: any[];
  keyFeatures: any[];
  specifications: any[];
  quantity: number;
  lowStockThreshold: number;
  listPrice: number;
  price: number;
  mainImage: string;
  images: string[];
  description: string;
  shortDescription: string;
  variants: any[];
  carrier?: any;
  relatedProducts: any[];
  reviewsRatings: any[];
  tags: string[];
  status: "draft" | "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface FilterOptions {
  search: string;
  category: string;
  status: string;
}

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    category: "",
    status: "",
  });

  // ---------- Delete modal state ----------
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all products
  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await findProducts();
      console.log(`Fetched ${result?.length || 0} products.`);
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === false
      ) {
        setAllProducts([]);
        return;
      }
      if (Array.isArray(result)) {
        setAllProducts(result);
      } else {
        setError("Unexpected response from server");
        setAllProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  // Safely get category name from populated object or string
  const getCategoryName = (cat: Product["categoryId"]): string => {
    if (!cat) return "Uncategorized";
    if (typeof cat === "string") return cat;
    return cat.name || "Uncategorized";
  };

  // Client‑side filtering
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const tags = (p.tags || []).join(" ").toLowerCase();
        return (
          name.includes(searchLower) ||
          sku.includes(searchLower) ||
          tags.includes(searchLower)
        );
      });
    }

    if (filters.category) {
      result = result.filter(
        (p) => getCategoryName(p.categoryId) === filters.category,
      );
    }

    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }

    return result;
  }, [allProducts, filters]);

  // Pagination
  const totalFiltered = filteredProducts.length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, page, itemsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  // ---------- Delete handlers ----------
  const handleDeleteClick = (product: Product) => {
    setDeleteTarget(product);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteProduct(deleteTarget._id);
      if (result.success) {
        await fetchAllProducts();
      } else {
        alert(result.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting the product.");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: "", category: "", status: "" });
    setPage(1);
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  // Build category options from the populated names
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      const name = getCategoryName(p.categoryId);
      if (name) cats.add(name);
    });
    return Array.from(cats);
  }, [allProducts]);

  // Stock badge based on quantity and threshold
  const getStockBadge = (product: Product) => {
    const qty = product.quantity || 0;
    const threshold = product.lowStockThreshold || 5;
    if (qty === 0) {
      return {
        label: "Out of Stock",
        className:
          "bg-destructive/20 text-destructive-foreground dark:text-destructive",
      };
    } else if (qty <= threshold) {
      return {
        label: "Low Stock",
        className: "bg-accent/20 text-accent-foreground dark:text-accent",
      };
    } else {
      return {
        label: "In Stock",
        className:
          "bg-secondary/20 text-secondary-foreground dark:text-secondary",
      };
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="bg-card p-4 rounded-lg shadow-md border border-border space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1"></div>
                <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-md border border-border">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-muted animate-pulse rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="h-6 w-16 bg-muted animate-pulse rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-foreground">All Products</h1>
        <Link
          href="/catalog/products/new"
          className="btn inline-flex items-center gap-2"
        >
          <span>+</span> New Product
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-card text-card-foreground p-4 rounded-lg shadow-md border border-border space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Search
            </label>
            <input
              type="text"
              defaultValue={filters.search}
              onChange={handleSearchChange}
              placeholder="Search by name, SKU, tags..."
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground capitalize"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground capitalize"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Products {totalFiltered > 0 && `(${totalFiltered})`}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span>No products found.</span>
                      {filters.search || filters.category || filters.status ? (
                        <button
                          onClick={handleClearFilters}
                          className="text-primary hover:underline text-sm"
                        >
                          Clear filters
                        </button>
                      ) : (
                        <Link
                          href="/catalog/products/new"
                          className="text-primary hover:underline text-sm"
                        >
                          Create your first product
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const stockBadge = getStockBadge(product);
                  return (
                    <tr key={product._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                              {product.mainImage ? (
                                <img
                                  src={product.mainImage}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <svg
                                  className="h-5 w-5 text-primary"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">
                              {product.name || "Untitled"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {product.tags?.slice(0, 2).join(", ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        CFA {product.listPrice || product.price || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stockBadge.className}`}
                        >
                          {stockBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/20 text-primary-foreground dark:text-primary">
                          {getCategoryName(product.categoryId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/catalog/products/edit/${product._id}`}
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                            aria-label="Delete product"
                            title="Delete product"
                          >
                            <Delete fontSize="small" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {paginatedProducts.length} of {totalFiltered} products
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition text-foreground"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition text-foreground"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Delete Confirmation Modal ---------- */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this product"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        danger={true}
      />
    </div>
  );
}
