"use client";

import React, { useEffect } from "react";
import { useAppDispatch } from "@/app/hooks";
import { useSearchParams } from "next/navigation";
import Category from "./category/page";
import { fetchProducts } from "@/fetch/fetchProducts";

const ListProduct = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.toLowerCase();
  const dispatch = useAppDispatch();

  // Only fetch product data if we're editing an existing product
  useEffect(() => {
    if (id) {
      dispatch(fetchProducts(id));
    }
  }, [dispatch, id]);

  return (
    <div className="p-2 lg:p-4">
      <h3 className="text-2xl font-semibold mb-6">
        {id ? "Edit Product" : "Add New Product"}
      </h3>
      <Category />
    </div>
  );
};

export default ListProduct;
