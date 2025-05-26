"use client";

import React, { useEffect, useState } from "react";
import { MoreHorizSharp } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { fetchProducts } from "@/fetch/fetchProducts";

interface Attrs {
  [groupName: string]: {
    [field: string]: any;
    group_order: number;
  };
}

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

  console.log("Products:", products);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Product List</h1>
      <ul className="flex flex-col gap-3">
        {products.allIds.map((id) => {
          const p = products.byId[id];
          const attrs = p.attributes as Attrs;

          // sort groups by group_order
          const groups = Object.entries(attrs).sort(
            ([, a], [, b]) => a.group_order - b.group_order
          );

          // Basic info fields
          const branding = attrs["Identification & Branding"] || {};
          const title = branding.Title || "Untitled product";
          const shortDesc = branding["Short Description"] || "";

          // Media & visuals
          const media = attrs["Media & Visuals"] || {};
          const images: string[] = media.Images || [];
          const imageUrl = images.length > 0 ? images[0] : null;
          const color =
            media.Color || attrs["Physical & Design"]?.color || undefined;

          // Pricing
          const priceGroup = attrs.Price || {};
          const salePrice = priceGroup["Sale Price"];
          const listPrice = priceGroup["List Price"];

          // Stock
          const stockGroup = attrs.Stock || {};
          const quantity = stockGroup.Quantity;
          const statusArr = stockGroup.Status || [];
          const status = statusArr.length > 0 ? statusArr[0] : "";

          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 border p-4 rounded-lg border-gray-800"
            >
              {/* Left: Thumbnail + Details */}
              <div className="flex-1 flex items-center gap-4">
                {imageUrl ? (
                  <div className="w-12 h-12 relative flex-shrink-0">
                    <Image
                      src={imageUrl}
                      alt={title}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-medium line-clamp-1">{title}</h2>
                  {shortDesc && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {shortDesc}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {salePrice && (
                      <span className="text-sm font-semibold">
                        cfa {salePrice}
                      </span>
                    )}
                    {listPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        cfa {listPrice}
                      </span>
                    )}
                  </div>
                  {color && <p className="text-xs mt-1">Color: {color}</p>}
                </div>
              </div>

              {/* Right: Stock + Menu */}
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  {status} ({quantity})
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
