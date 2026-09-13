// app/(pos)/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePOSStore } from "@/app/store/posStore";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { findProducts } from "@/app/actions/products";
import { completePOSOrder } from "@/app/actions/order";
import Image from "next/image";

// Product interface matching the current schema
interface Product {
  _id: string;
  name: string;
  sku: string;
  slug: string;
  categoryId: string | { _id: string; name: string };
  brand: string | { _id: string; name: string };
  quantity: number;
  lowStockThreshold: number;
  price: number;
  images: string[];
  description: string;
  shortDescription: string;
  status: "draft" | "active" | "inactive";
}

const PAGE_SIZE = 24;

export default function Pos() {
  const { data: session } = useSession();
  const [sessionId, setSessionId] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const {
    items,
    subtotal,
    tax,
    discount,
    total: cartTotal,
    isLoading,
    error: posError,
    loadCart,
    addItem,
    updateItem,
    removeItem,
    clear,
  } = usePOSStore();

  // ----- Initialize POS cart session -----
  useEffect(() => {
    let sid = localStorage.getItem("pos_session_id");
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem("pos_session_id", sid);
    }
    setSessionId(sid);

    const identifier = session?.user?.id
      ? { userId: session.user.id }
      : { sessionId: sid };
    loadCart(identifier);
  }, [session, loadCart]);

  // ----- Fetch products -----
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await findProducts({
        page,
        pageSize: PAGE_SIZE,
        sort: "name",
        sortDir: "asc",
        q: searchTerm.trim() || undefined,
      });

      if (result && Array.isArray(result.products)) {
        setProducts(result.products);
        setTotal(result.total ?? result.products.length);
        setTotalPages(result.totalPages ?? 0);
        if (result.products.length === 0) {
          setError("No active products found.");
        }
      } else {
        setProducts([]);
        setTotal(0);
        setTotalPages(0);
        setError("Failed to fetch products");
      }
    } catch (err: any) {
      setProducts([]);
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search is already applied server-side; keep the local filter as a safety net
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [products, searchTerm]);

  // ----- Cart actions -----
  const handleAddToCart = useCallback(
    async (productId: string) => {
      const product = products.find((p) => p._id === productId);
      const currentInCart =
        items.find((item) => item.productId === productId)?.quantity || 0;
      const availableQty = Number(product?.quantity ?? 0);

      if (!product) return;

      if (availableQty <= 0) {
        alert("This product is out of stock.");
        return;
      }

      if (currentInCart >= availableQty) {
        alert(
          `Only ${availableQty} unit${availableQty > 1 ? "s" : ""} available in stock.`,
        );
        return;
      }

      try {
        await addItem(productId, undefined, 1);
      } catch (err: any) {
        alert(err?.message || "Failed to add item to cart.");
      }
    },
    [products, items, addItem],
  );

  const handleUpdateQuantity = useCallback(
    async (itemId: string, newQty: number) => {
      const item = items.find((entry) => entry._id === itemId);
      if (!item) return;

      const product = products.find((entry) => entry._id === item.productId);
      const stockQty = Number(product?.quantity ?? 0);

      if (newQty > 0 && product && newQty > stockQty) {
        alert(
          `Only ${stockQty} unit${stockQty > 1 ? "s" : ""} available in stock.`,
        );
        return;
      }

      try {
        await updateItem(itemId, newQty);
      } catch (err: any) {
        alert(err?.message || "Failed to update quantity.");
      }
    },
    [items, products, updateItem],
  );

  const handleRemove = useCallback(
    async (itemId: string) => {
      try {
        await removeItem(itemId);
      } catch (err: any) {
        alert(err?.message || "Failed to remove item.");
      }
    },
    [removeItem],
  );

  const handleCheckout = useCallback(async () => {
    try {
      const identifier = session?.user?.id
        ? { userId: session.user.id }
        : { sessionId };

      const result = await completePOSOrder(identifier, {
        email: session?.user?.email || "pos@local",
        firstName: session?.user?.name?.split(" ")[0] || "POS",
        lastName:
          session?.user?.name?.split(" ").slice(1).join(" ") || "Customer",
        paymentMethod: "cash",
        notes: "POS checkout",
      });

      if (!result?.success) {
        alert(result?.error || "Unable to complete sale.");
        return;
      }

      await clear();
      alert("Sale completed and inventory updated.");
      // Refresh product list so stock quantities reflect the sale
      fetchProducts();
    } catch (err: any) {
      alert(err?.message || "Unable to complete sale.");
    }
  }, [session, sessionId, clear, fetchProducts]);

  const handleClearCart = useCallback(async () => {
    if (items.length === 0) return;
    if (!confirm("Are you sure you want to clear the cart?")) return;
    try {
      await clear();
    } catch (err: any) {
      alert(err?.message || "Failed to clear cart.");
    }
  }, [items.length, clear]);

  return (
    <div className="flex h-[100dvh] flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Left: Product Catalog */}
      <div className="flex min-h-0 flex-1 flex-col py-3 sm:py-4 lg:w-2/3 lg:flex-none">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold sm:text-2xl">Products</h2>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading products...</p>
        )}
        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto content-start sm:grid-cols-2 xl:grid-cols-3">
          {!loading &&
            filteredProducts.map((product) => (
              <div
                key={product._id}
                className="flex flex-col items-center rounded-xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md"
              >
                <div className="relative h-32 w-full overflow-hidden rounded-lg bg-muted">
                  {product.images?.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name || "Product image"}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <h3 className="mt-2 text-center text-sm font-semibold line-clamp-2">
                  {product.name}
                </h3>
                <p className="font-bold text-primary">
                  cfa {product.price?.toFixed(2) || "0.00"}
                </p>
                <button
                  onClick={() => handleAddToCart(product._id)}
                  className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  disabled={product.quantity <= 0}
                >
                  {product.quantity > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
              </div>
            ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} products
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-muted disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-muted disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Cart */}
      <div className="flex h-1/2 min-h-[200px] w-full flex-col border-t border-border bg-muted/30 p-3 sm:p-4 lg:h-auto lg:min-h-0 lg:w-1/3 lg:flex-1 lg:border-l lg:border-t-0">
        <h2 className="mb-4 text-xl font-bold sm:text-2xl">Cart</h2>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading cart...</p>
        )}
        {posError && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {posError}
          </p>
        )}

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {items.map((item: any) => (
            <li
              key={item._id}
              className="flex items-center justify-between gap-2 rounded bg-white p-2 shadow"
            >
              <Image
                src={item.image || "/placeholder.png"}
                alt={item.name || "Cart item"}
                width={50}
                height={50}
                className="h-12 w-12 rounded object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {item.name || item.productId}
                </p>
                <p className="text-sm text-gray-600">
                  ${Number(item.price || 0).toFixed(2)} × {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleUpdateQuantity(item._id, item.quantity - 1)
                  }
                  className="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
                >
                  -
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() =>
                    handleUpdateQuantity(item._id, item.quantity + 1)
                  }
                  className="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
                >
                  +
                </button>
                <button
                  onClick={() => handleRemove(item._id)}
                  className="ml-1 text-red-500 hover:text-red-700"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Cart totals */}
        {items.length > 0 && (
          <div className="mt-auto border-t pt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${Number(subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (est.)</span>
              <span>${Number(tax || 0).toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-${Number(discount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${Number(cartTotal || 0).toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="mt-4 w-full rounded-lg bg-primary py-2 text-white transition hover:bg-green-700 disabled:opacity-50"
              disabled={items.length === 0 || isLoading}
            >
              Complete Sale
            </button>
            <button
              onClick={handleClearCart}
              className="mt-2 w-full text-sm text-red-500 hover:underline"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
