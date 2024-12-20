"use client";

import { findProducts } from "@/app/actions/products";
import { Product } from "@/constant/types";
import { MoreHorizSharp } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [ind, setIndex] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Load product data if editing
      const product = await findProducts();
      setProducts(product ?? []);
    };

    fetchData();
  }, []);

  function showMenu(i: string) {
    setIndex(i);
  }

  return (
    <>
      Product List
      <ul className="flex flex-col gap-3">
        {products?.map((product, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-3 border p-2 rounded-lg border-gray-800"
          >
            <div>
              <Image
                src={product.imageUrls?.[0] as string}
                alt="product image"
                width={50}
                height={50}
                className=""
              />
              <p>{product.productName}</p>
            </div>
            <div className="relative">
              <span
                onClick={() => showMenu(product?._id as string)}
                className="border p-2 rounded-lg border-gray-800"
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
                  <li className=" p-2 border rounded-lg border-gray-800 cursor-pointer">
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
        ))}
      </ul>
    </>
  );
};

export default ProductList;
