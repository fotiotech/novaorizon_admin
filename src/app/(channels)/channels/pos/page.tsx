// app/(pos)/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { usePOSStore } from "@/app/store/posStore";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { findProducts } from "@/app/actions/products";
import { completePOSOrder } from "@/app/actions/order";
import Image from "next/image";
import {
  Add,
  Remove,
  Close,
  Search,
  ShoppingCart,
  Inventory2,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Cart item row (memoized — the cart list re-renders on every
// quantity change, this keeps the rows cheap)
// ------------------------------------------------------------------
interface CartItemRowProps {
  item: any;
  onUpdate: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
}

const CartItemRow = memo(function CartItemRow({
  item,
  onUpdate,
  onRemove,
}: CartItemRowProps) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2">
      <div className="relative flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded bg-muted">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name || "Cart item"}
            className="h-full w-full object-cover"
          />
        ) : (
          <Inventory2 fontSize="small" className="text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.name || item.productId}
        </p>
        <p className="text-xs text-muted-foreground">
          ${Number(item.price || 0).toFixed(2)} × {item.quantity}
        </p>
      </div>

      <div className="flex flex-none items-center gap-1">
        <button
          type="button"
          onClick={() => onUpdate(item._id, item.quantity - 1)}
          aria-label="Decrease quantity"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-90"
        >
          <Remove sx={{ fontSize: 14 }} />
        </button>
        <span className="w-6 text-center text-sm tabular-nums">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdate(item._id, item.quantity + 1)}
          aria-label="Increase quantity"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-90"
        >
          <Add sx={{ fontSize: 14 }} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item._id)}
          aria-label="Remove item"
          className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90"
        >
          <Close sx={{ fontSize: 14 }} />
        </button>
      </div>
    </li>
  );
});

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

  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

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
    void fetchProducts();
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
        toast.error("This product is out of stock.");
        return;
      }

      if (currentInCart >= availableQty) {
        toast.error(
          `Only ${availableQty} unit${availableQty > 1 ? "s" : ""} available in stock.`,
        );
        return;
      }

      try {
        await addItem(productId, undefined, 1);
      } catch (err: any) {
        toast.error(err?.message || "Failed to add item to cart.");
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
        toast.error(
          `Only ${stockQty} unit${stockQty > 1 ? "s" : ""} available in stock.`,
        );
        return;
      }

      try {
        await updateItem(itemId, newQty);
      } catch (err: any) {
        toast.error(err?.message || "Failed to update quantity.");
      }
    },
    [items, products, updateItem],
  );

  const handleRemove = useCallback(
    async (itemId: string) => {
      try {
        await removeItem(itemId);
      } catch (err: any) {
        toast.error(err?.message || "Failed to remove item.");
      }
    },
    [removeItem],
  );

  const handleCheckout = useCallback(async () => {
    const toastId = toast.loading("Processing sale…");
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
        toast.error(result?.error || "Unable to complete sale.", {
          id: toastId,
        });
        return;
      }

      await clear();
      toast.success("Sale completed and inventory updated.", { id: toastId });
      void fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || "Unable to complete sale.", { id: toastId });
    }
  }, [session, sessionId, clear, fetchProducts]);

  const handleClearCart = useCallback(async () => {
    if (items.length === 0) return;
    try {
      await clear();
      toast.success("Cart cleared");
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear cart.");
    } finally {
      setIsClearDialogOpen(false);
    }
  }, [items.length, clear]);

  const isFiltering = searchTerm.trim() !== "";

  return (
    <div className="flex h-[100dvh] flex-col bg-background lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* ================================================================= */}
      {/* LEFT: Products                                                    */}
      {/* ================================================================= */}
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4 lg:w-2/3 lg:flex-none">
        {/* Search */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              fontSize="small"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          {isFiltering && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Close fontSize="small" />
            </button>
          )}
        </div>

        {/* Error / empty */}
        {!loading && error && filteredProducts.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-card px-5 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inventory2 className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isFiltering
                ? "Try a different search term."
                : "Add products to your catalog to sell them here."}
            </p>
          </div>
        )}

        {/* Product grid */}
        <div className="grid flex-1 content-start gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="mb-2 h-28 w-full animate-pulse rounded bg-muted" />
                  <div className="mb-1 h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="mb-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              ))
            : filteredProducts.map((product) => {
                const inCart =
                  items.find((item) => item.productId === product._id)
                    ?.quantity ?? 0;
                const remaining = Math.max(
                  0,
                  Number(product.quantity ?? 0) - inCart,
                );
                const outOfStock = product.quantity <= 0;
                const maxed = remaining <= 0 && !outOfStock;

                return (
                  <div
                    key={product._id}
                    className="group flex flex-col rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30"
                  >
                    {/* Image */}
                    <div className="relative h-28 w-full overflow-hidden rounded bg-muted">
                      {product.images?.length > 0 ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name || "Product image"}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                          <Inventory2 fontSize="small" />
                        </div>
                      )}

                      {/* Stock chip */}
                      <div className="absolute right-1.5 top-1.5">
                        {outOfStock ? (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                            Out
                          </span>
                        ) : remaining <= 5 ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                            {remaining} left
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Info */}
                    <h3 className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
                      {product.name}
                    </h3>
                    <p className="text-sm font-semibold text-primary">
                      ${product.price?.toFixed(2) || "0.00"}
                    </p>

                    {/* Add button */}
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product._id)}
                      disabled={outOfStock || maxed}
                      className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                      {outOfStock
                        ? "Out of stock"
                        : maxed
                          ? "No more available"
                          : "Add to cart"}
                    </button>
                  </div>
                );
              })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {totalPages} · {total} products
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft sx={{ fontSize: 14 }} />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight sx={{ fontSize: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* RIGHT: Cart                                                        */}
      {/* ================================================================= */}
      <div className="flex min-h-0 w-full flex-col border-t border-border bg-card lg:h-auto lg:w-1/3 lg:flex-none lg:border-l lg:border-t-0">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Cart</h2>
            {items.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearDialogOpen(true)}
              className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
            >
              Clear all
            </button>
          )}
        </div>

        {/* POS error */}
        {posError && (
          <div className="mx-3 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {posError}
          </div>
        )}

        {/* Cart list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading cart…</p>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <ShoppingCart
                  fontSize="small"
                  className="text-muted-foreground"
                />
              </div>
              <p className="text-sm font-medium text-foreground">
                Cart is empty
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add products from the left to start a sale.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item: any) => (
                <CartItemRow
                  key={item._id}
                  item={item}
                  onUpdate={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Totals + checkout */}
        {items.length > 0 && (
          <div className="border-t border-border p-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums text-foreground">
                  ${Number(subtotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (est.)</span>
                <span className="tabular-nums text-foreground">
                  ${Number(tax || 0).toFixed(2)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="tabular-nums">
                    -${Number(discount || 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                <span>Total</span>
                <span className="tabular-nums">
                  ${Number(cartTotal || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={items.length === 0 || isLoading}
              className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Complete sale
            </button>
          </div>
        )}
      </div>

      {/* Clear-cart confirmation */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={handleClearCart}
        title="Clear cart"
        message={`Remove all ${items.length} item${items.length === 1 ? "" : "s"} from the cart? This cannot be undone.`}
        confirmLabel="Clear cart"
        danger
      />
    </div>
  );
}
