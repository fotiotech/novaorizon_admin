// app/(pos)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { usePOSStore } from "@/app/store/posStore";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { findProducts } from "@/app/actions/products";
import { completePOSOrder } from "@/app/actions/order";
import Image from "next/image";

// Updated Product interface to match the new schema
interface Product {
  _id: string;
  name: string; // was 'title'
  sku: string;
  slug: string;
  categoryId: string | { _id: string; name: string };
  brand: string | { _id: string; name: string };
  quantity: number;
  lowStockThreshold: number;
  listPrice: number; // was 'list_price'
  price: number; // sale price (optional)
  mainImage: string; // was 'main_image'
  images: string[];
  description: string;
  shortDescription: string;
  status: "draft" | "active" | "inactive";
  // Additional fields may be needed for variants, but not used here
}

export default function Pos() {
  const { data: session } = useSession();
  const [sessionId, setSessionId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const {
    items,
    subtotal,
    tax,
    discount,
    total,
    isLoading,
    error: posError,
    loadCart,
    addItem,
    updateItem,
    removeItem,
    clear,
  } = usePOSStore();

  // Initialize cart session
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

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await findProducts(); // returns array of products with new schema
        if (Array.isArray(result)) {
          setProducts(result);
        } else {
          setError(result.error || "Failed to fetch products");
        }
      } catch (err: any) {
        setError(err.message || "Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Filter products by search term (searches on 'name')
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddToCart = async (productId: string) => {
    const product = products.find((item) => item._id === productId);
    const currentInCart =
      items.find((item) => item.productId === productId)?.quantity || 0;
    const availableQty = Number(product?.quantity ?? 0);

    if (product && availableQty <= 0) {
      alert("This product is out of stock.");
      return;
    }

    if (product && currentInCart >= availableQty) {
      alert(
        `Only ${availableQty} unit${availableQty > 1 ? "s" : ""} available in stock.`,
      );
      return;
    }

    await addItem(productId, undefined, 1);
  };

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
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

    await updateItem(itemId, newQty);
  };

  const handleCheckout = async () => {
    try {
      const result = await completePOSOrder(
        session?.user?.id ? { userId: session.user.id } : { sessionId },
        {
          email: session?.user?.email || "pos@local",
          firstName: session?.user?.name?.split(" ")[0] || "POS",
          lastName:
            session?.user?.name?.split(" ").slice(1).join(" ") || "Customer",
          paymentMethod: "cash",
          notes: "POS checkout",
        },
      );

      if (!result.success) {
        alert(result.error || "Unable to complete sale.");
        return;
      }

      await clear();
      alert("Sale completed and inventory updated.");
    } catch (error: any) {
      alert(error.message || "Unable to complete sale.");
    }
  };

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
        {posError && <p className="text-sm text-destructive">{posError}</p>}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto content-start sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="flex flex-col items-center rounded-xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-32 w-full overflow-hidden rounded-lg bg-muted">
                {product.mainImage ? (
                  <Image
                    src={product.mainImage}
                    alt={product.name || "Product image"}
                    fill
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
                cfa {product.listPrice?.toFixed(2) || "0.00"}
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
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {item.name || item.productId}
                </p>
                <p className="text-sm text-gray-600">
                  ${item.price.toFixed(2)} × {item.quantity}
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
                  onClick={() => removeItem(item._id)}
                  className="ml-1 text-red-500 hover:text-red-700"
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
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (est.)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="mt-4 w-full rounded-lg bg-primary py-2 text-white transition hover:bg-green-700 disabled:opacity-50"
              disabled={items.length === 0 || isLoading}
            >
              Complete Sale
            </button>
            <button
              onClick={() => clear()}
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
