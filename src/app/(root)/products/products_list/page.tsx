"use client";

import { MoreHorizSharp } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { fetchProducts } from "@/fetch/fetchProducts";

const ProductList = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state: RootState) => state.product);
  const [ind, setIndex] = useState("");

  // console.log("products", products);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  function showMenu(i: string) {
    setIndex(i);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Product List</h1>
      <ul className="flex flex-col gap-3">
        {products?.allIds.map((id) => {
          const product = products.byId[id];
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 border p-4 rounded-lg border-gray-800"
            >
              {/* Product Image and Name */}
              <div className="flex items-center gap-4">
                <Image
                  src={product.imageUrls?.[0] || "/placeholder.png"}
                  alt={product.productName || "Product Image"}
                  width={50}
                  height={50}
                  className="rounded-lg"
                />
                <p className="text-lg font-medium line-clamp-1">{product.productName}</p>
              </div>

              {/* Menu Actions */}
              <div className="relative">
                <span
                  onClick={() => showMenu(id)}
                  className="border p-2 rounded-lg border-gray-800 cursor-pointer"
                >
                  <MoreHorizSharp />
                </span>

                <ul
                  className={`${
                    ind === product._id
                      ? "absolute -bottom-28 w-28 -left-20 z-10 dark:bg-pri-dark rounded-lg p-2 flex flex-col gap-2"
                      : "hidden"
                  }`}
                >
                  <Link href={`/products/list_product?id=${product._id}`}>
                    <li className="p-2 border rounded-lg border-gray-800 cursor-pointer">
                      Edit
                    </li>
                  </Link>
                  <Link href={`/products/delete/${product._id}`}>
                    <li className="p-2 border rounded-lg border-gray-800 cursor-pointer">
                      Delete
                    </li>
                  </Link>
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProductList;