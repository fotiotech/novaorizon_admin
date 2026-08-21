"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { findProducts } from "@/app/actions/products";
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
  category_id: { _id: string; name: string } | string; // populated object or string ID
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
      // Check for error response
      if (result && typeof result === "object" && "success" in result && result.success === false) {
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
        (p:any) =>
          p.title?.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower) ||
          p.model?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      result = result.filter((p:any) => getCategoryName(p.category_id) === filters.category);
    }

    if (filters.status) {
      result = result.filter((p:any) => (p.status || "active") === filters.status);
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

  // Delete stub – replace with actual delete action
  const handleDelete = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    alert("Delete functionality not implemented.");
  };

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setFilters((prev:any) => ({ ...prev, search: value }));
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev:any) => ({ ...prev, [name]: value }));
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
    allProducts.forEach((p:any) => {
      const name = getCategoryName(p.category_id);
      if (name) cats.add(name);
    });
    return Array.from(cats);
  }, [allProducts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pri-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading products...</p>
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
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between py-6 gap-4">
        <h1 className="text-3xl font-bold text-foreground">All Products</h1>
        <Link
          href="/catalog/products/new"
          className="bg-pri-500 hover:bg-pri-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + New Product
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-card p-4 rounded-lg shadow-md border border-border space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
            <input
              type="text"
              defaultValue={filters.search}
              onChange={handleSearchChange}
              placeholder="Search by title, SKU, model..."
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Categories</option>
              {categories.map((cat:any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Products {totalFiltered > 0 && `(${totalFiltered})`}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product:any) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-pri-500/10 flex items-center justify-center overflow-hidden">
                            {product.main_image ? (
                              <img src={product.main_image} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <span className="font-medium text-pri-500">
                                {product.title?.charAt(0).toUpperCase() || "P"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{product.title || "Untitled"}</div>
                          <div className="text-sm text-muted-foreground">{product.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      ${product.sale_price || product.list_price || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${product.stock_status?.includes("In Stock") ? "bg-thir-500/20 text-thir-700 dark:text-thir-400"
                        : product.stock_status?.includes("Low Stock") ? "bg-sec-500/20 text-sec-700 dark:text-sec-400"
                        : "bg-destructive/20 text-destructive"}`}>
                        {product.stock_status?.join(", ") || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pri-500/20 text-pri-700 dark:text-pri-400">
                        {getCategoryName(product.category_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link href={`/catalog/products/edit?id=${product._id}`} className="text-pri-500 hover:text-pri-600">Edit</Link>
                        <button onClick={() => handleDelete(product._id)} className="text-destructive hover:text-destructive/80">
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
              <span className="px-3 py-1 text-foreground">Page {page} of {totalPages}</span>
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