// app/(pos)/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { usePOSStore } from "@/app/store/posStore";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { findProducts } from "@/app/actions/products";
import Image from "next/image";

interface Product {
  _id: string;
  title: string;
  list_price: number;
  main_image?: string;
  slug: string;
  category_id: string | { _id: string; name: string };
  brand: string | { _id: string; name: string };
  quantity: number;
  lowStockThreshold: number;
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
    loadCart,
    addItem,
    updateItem,
    removeItem,
    clear,
    applyDiscount,
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
        const result = await findProducts(); // no id => returns array
        console.log("Fetched products:", result);
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

  // Filter products by search term (name or barcode)
  const filteredProducts = products.filter((p) =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Add to cart handler
  const handleAddToCart = (productId: string) => {
    const identifier = session?.user?.id
      ? { userId: session.user.id }
      : { sessionId };
    // Default quantity 1; you could also prompt for quantity
    addItem(productId, undefined, 1);
  };

  // Update quantity in cart
  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    updateItem(itemId, newQty);
  };

  // Checkout (placeholder)
  const handleCheckout = async () => {
    // TODO: Implement order creation using createOrUpdateOrder
    alert("Checkout logic goes here");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Product Catalog */}
      <div className="w-2/3 p-4 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold">Products</h2>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Barcode scanner could listen to keyboard events here */}
        </div>
        {loading && <p className="text-gray-500">Loading products...</p>}
        {error && <p className="text-red-500">{error}</p>}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start">
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="border rounded-lg p-3 shadow hover:shadow-md transition flex flex-col items-center"
            >
              <div className="w-full h-32 relative bg-gray-100 rounded">
                {product.main_image ? (
                  <Image
                    src={product.main_image}
                    alt={product.title}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No image
                  </div>
                )}
              </div>
              <h3 className="font-semibold mt-2 text-center text-sm line-clamp-2">
                {product.title}
              </h3>
              <p className="text-blue-600 font-bold">
                ${product.list_price?.toFixed(2) || "0.00"}
              </p>
              <button
                onClick={() => handleAddToCart(product._id)}
                className="mt-2 w-full bg-blue-600 text-white py-1 rounded hover:bg-blue-700 transition disabled:bg-gray-400"
                disabled={product.quantity <= 0}
              >
                {product.quantity > 0 ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-1/3 p-4 bg-gray-100 flex flex-col border-l">
        <h2 className="text-2xl font-bold mb-4">Cart</h2>
        {isLoading && <p className="text-gray-500">Loading cart...</p>}
        <ul className="flex-1 overflow-y-auto space-y-2">
          {items.map((item: any) => (
            <li
              key={item._id}
              className="flex justify-between items-center bg-white p-2 rounded shadow"
            >
              <div className="flex-1">
                <p className="font-medium">{item.name || item.productId}</p>
                <p className="text-sm text-gray-600">
                  ${item.price.toFixed(2)} × {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleUpdateQuantity(item._id, item.quantity - 1)
                  }
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  -
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() =>
                    handleUpdateQuantity(item._id, item.quantity + 1)
                  }
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item._id)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Cart totals */}
        {items.length > 0 && (
          <div className="border-t pt-4 mt-auto">
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
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              disabled={items.length === 0 || isLoading}
            >
              Complete Sale
            </button>
            <button
              onClick={() => clear()}
              className="w-full mt-2 text-sm text-red-500 hover:underline"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
