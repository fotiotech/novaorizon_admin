"use client";
import Category from "./category/page";
import { useAppDispatch } from "@/app/hooks";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { fetchProducts } from "@/fetch/fetchProducts";

const ListProduct = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.toLowerCase();
  const dispatch = useAppDispatch();


  useEffect(() => {
    if (id) {
      dispatch(fetchProducts(id));
    }
  }, [dispatch, id]);

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">
        {id ? "Edit product" : "Add Product"}
      </h3>
      <div>
        <Category />
      </div>
    </div>
  );
};

export default ListProduct;
