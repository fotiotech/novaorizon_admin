"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  findProducts,
  deleteProduct,
  getProductFilterCategories,
} from "@/app/actions/products";
import { Delete } from "@mui/icons-material";
import { useDebouncedCallback } from "use-debounce";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { toast } from "react-hot-toast";

interface Product {
  _id: string;
  name: string;
  sku: string;
  slug: string;
  categoryId: { _id: string; name: string } | string | null;
  brand: { _id: string; name: string } | string | null;
  quantity: number;
  lowStockThreshold: number;
  listPrice: number;
  price: number;
  images: string[];
  tags: string[];
  status: "draft" | "active" | "inactive";
  createdAt: string;
}

interface FilterOptions {
  search: string;
  categoryId: string;
  status: string;
}

const ITEMS_PER_PAGE = 10;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    categoryId: "",
    status: "",
  });
  const [searchInput, setSearchInput] = useState("");

  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // Load category filter options once.
  useEffect(() => {
    (async () => {
      const rows = await getProductFilterCategories();
      setCategories(rows);
    })();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await findProducts({
        q: filters.search,
        categoryId: filters.categoryId || undefined,
        status: (filters.status as any) || undefined,
        page,
        pageSize: ITEMS_PER_PAGE,
        sort: "createdAt",
        sortDir: "desc",
      });
      setProducts(res.products as Product[]);
      setTotal(res.total);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting product...");
    try {
      const result = await deleteProduct(deleteTarget._id);
      if (result.success) {
        toast.success(`"${deleteTarget.name}" deleted`, { id: toastId });
        await fetchProducts();
      } else {
        toast.error(result.error || "Failed to delete product", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("An error occurred while deleting the product.", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, 400);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setSearchInput("");
    debouncedSearch.cancel();
    setFilters({ search: "", categoryId: "", status: "" });
    setPage(1);
  };

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const hasActiveFilters =
    !!filters.search || !!filters.categoryId || !!filters.status;

  const getCategoryName = (cat: Product["categoryId"]): string => {
    if (!cat) return "Uncategorized";
    if (typeof cat === "string") return cat;
    return cat.name || "Uncategorized";
  };

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
    }
    return {
      label: "In Stock",
      className:
        "bg-secondary/20 text-secondary-foreground dark:text-secondary",
    };
  };

  if (loading && products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="bg-card p-3 rounded-lg shadow-md border border-border mb-4">
          <div className="h-9 w-full bg-muted animate-pulse rounded" />
        </div>
        <div className="bg-card p-6 rounded-lg shadow-md border border-border">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-muted animate-pulse rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
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
          <button
            onClick={() => void fetchProducts()}
            className="mt-3 px-4 py-1.5 text-sm border border-destructive/40 rounded-md hover:bg-destructive/10 transition"
          >
            Retry
          </button>
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

      {/* Compact filter bar */}
      <div className="bg-card text-card-foreground rounded-lg shadow-sm border border-border mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2">
          <div className="relative flex-1 min-w-0">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search name, SKU, tags..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          <select
            name="categoryId"
            value={filters.categoryId}
            onChange={handleSelectChange}
            className="w-full sm:w-48 px-2.5 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground capitalize"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleSelectChange}
            className="w-full sm:w-32 px-2.5 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground capitalize"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-transparent hover:border-input rounded-md transition-colors"
              title="Clear filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Products {total > 0 && `(${total})`}
          </h2>
          {loading && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Product",
                  "SKU",
                  "Price",
                  "Stock",
                  "Category",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span>No products found.</span>
                      {hasActiveFilters ? (
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
                products.map((product) => {
                  const stockBadge = getStockBadge(product);
                  return (
                    <tr key={product._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                              {product.images?.[0] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.images[0]}
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
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/20 text-primary">
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
                            onClick={() => {
                              setDeleteTarget(product);
                              setIsDeleteOpen(true);
                            }}
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
              Showing {products.length} of {total} products
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

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this product"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        danger
      />
    </div>
  );
}
