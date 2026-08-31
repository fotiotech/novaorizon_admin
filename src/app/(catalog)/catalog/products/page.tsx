"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { findProducts, deleteProduct } from "@/app/actions/products";
import { Delete } from "@mui/icons-material";
import { useDebouncedCallback } from "use-debounce";

// Product type matches the structure returned by findProducts (populated)
interface Product {
  _id: string;
  title: string;
  model: string;
  sku: string;
  sale_price: number;
  list_price: number;
  stock_status: string[];
  main_image: string;
  status?: string;
  category_id: { _id: string; name: string } | string;
  brand: { _id: string; name: string } | string;
  quantity: number;
  lowStockThreshold: number;
  createdAt: string;
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

  // Fetch all products (no id → array)
  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await findProducts();
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === false
      ) {
        setError(result.error || "Failed to fetch products");
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
  const getCategoryName = (cat: Product["category_id"]): string => {
    if (!cat) return "Uncategorized";
    if (typeof cat === "string") return cat;
    return cat.name || "Uncategorized";
  };

  // Client‑side filtering
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower) ||
          p.model?.toLowerCase().includes(searchLower),
      );
    }

    if (filters.category) {
      result = result.filter(
        (p) => getCategoryName(p.category_id) === filters.category,
      );
    }

    if (filters.status) {
      result = result.filter((p) => (p.status || "active") === filters.status);
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

  // Delete product handler
  const handleDelete = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    try {
      const result = await deleteProduct(productId);
      if (result.success) {
        await fetchAllProducts();
      } else {
        alert(result.error || "Failed to delete product.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting the product.");
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
      const name = getCategoryName(p.category_id);
      if (name) cats.add(name);
    });
    return Array.from(cats);
  }, [allProducts]);

  // Theme-aware badge classes
  const getStockBadgeClass = (statuses: string[]) => {
    const base =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    if (statuses?.includes("In Stock"))
      return `${base} bg-secondary/20 text-secondary-foreground dark:text-secondary`;
    if (statuses?.includes("Low Stock"))
      return `${base} bg-accent/20 text-accent-foreground dark:text-accent`;
    return `${base} bg-destructive/20 text-destructive-foreground dark:text-destructive`;
  };

  // Loading skeleton (enhanced)
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
              placeholder="Search by title, SKU, model..."
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
                paginatedProducts.map((product) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                            {product.main_image ? (
                              <img
                                src={product.main_image}
                                alt={product.title}
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
                            {product.title || "Untitled"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      CFA {product.sale_price || product.list_price || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={getStockBadgeClass(product.stock_status)}
                      >
                        {product.stock_status?.join(", ") || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/20 text-primary-foreground dark:text-primary">
                        {getCategoryName(product.category_id)}
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
                          onClick={() => handleDelete(product._id)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                          aria-label="Delete product"
                        >
                          <Delete fontSize="small" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
