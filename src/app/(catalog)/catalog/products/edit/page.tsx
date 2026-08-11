"use client";

import React, { useEffect } from "react";
import ProductForm from "../component/ProductForm";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import Category from "../component/Category";
import { useSearchParams } from "next/navigation";
import { fetchProducts } from "@/fetch/fetchProducts";

const EditProduct = () => {
  const dispatch = useAppDispatch();
  const pId = useSearchParams().get("id");

  if (!pId) return;

  // Fetch products when ID changes
  useEffect(() => {
    dispatch(fetchProducts(pId));
  }, [pId, dispatch]);

  return (
    <div>
      <ProductForm />
    </div>
  );
};

export default EditProduct;
