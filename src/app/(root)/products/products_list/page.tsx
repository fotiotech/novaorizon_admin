"use client";

import React, { useEffect, useState } from "react";
import { MoreHorizSharp } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { fetchProducts } from "@/fetch/fetchProducts";

const ProductList = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state: RootState) => state.product);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const showMenu = (id: string) => {
    setMenuOpenFor((prev) => (prev === id ? null : id));
  };

  if (!products.allIds.length) {
    return (
      <div className="text-center text-gray-500">
        No products found. Please add some products.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Product List</h1>
      <ul className="flex flex-col gap-3">
        {products.allIds.map((id) => {
          const p = products.byId[id];
          if (!p) return null;

          // Identification & Branding
          const { sku, name } = p.identification_branding || {};

          // Media & Visuals
          const media = p.media_visuals || {};
          const imageUrl = media.main_image || media.gallery?.[0] || null;

          // Pricing & Availability
          const pricing = p.pricing_availability || {};
          const salePrice = pricing.price;
          const currency = pricing.currency || "";

          // Inventory
          const quantity = pricing.quantity;
          const stockStatus = pricing.stock_status || "";

          // Descriptions
          const descriptions = p.descriptions || {};
          const shortDesc = descriptions.short || "";

          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 border rounded-lg border-gray-800"
            >
              {/* Left: Thumbnail + Details */}
              <div className="flex-1 flex items-center gap-4">
                {imageUrl ? (
                  <div className="w-12 h-12 relative flex-shrink-0">
                    <Image
                      src={imageUrl}
                      alt={name || "Product Image"}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-medium line-clamp-1">
                    {name || "Untitled Product"}
                  </h2>
                  {shortDesc && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {shortDesc}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {salePrice != null && (
                      <span className="text-sm font-semibold">
                        {currency} {salePrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Stock + Menu */}
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  {stockStatus} ({quantity})
                </div>
                <div className="relative">
                  <button
                    title="Actions"
                    type="button"
                    onClick={() => showMenu(id)}
                    className="p-2 border rounded-lg border-gray-800"
                  >
                    <MoreHorizSharp />
                  </button>
                  {menuOpenFor === id && (
                    <ul className="absolute right-0 mt-2 w-32 bg-white dark:bg-pri-dark rounded-lg p-2 shadow-lg flex flex-col gap-1">
                      <Link href={`/products/list_product?id=${id}`}>
                        <li className="p-2 hover:bg-gray-100 rounded cursor-pointer">
                          Edit
                        </li>
                      </Link>
                      <Link href={`/products/delete?id=${id}`}>
                        <li className="p-2 hover:bg-gray-100 rounded cursor-pointer">
                          Delete
                        </li>
                      </Link>
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProductList;
