"use client";
import Category from "./category/page";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import React, { useEffect } from "react";
import { Product } from "@/constant/types";
import { useSearchParams } from "next/navigation";
import { findProducts } from "@/app/actions/products";
import {
  setProductData,
  VariantState,
  resetProduct,
  fetchProductById,
} from "@/app/store/slices/productSlice";

const ListProduct = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.toLowerCase();
  const dispatch = useAppDispatch();
  const {
    productId,
    sku,
    product_name,
    brand_id,
    department,
    description,
    finalPrice,
    imageUrls,
    category_id,
    attributes,
    basePrice,
    taxRate,
    discount,
    currency,
    productCode,
    stockQuantity,
    status,
    variants,
  } = useAppSelector((state) => state.product);

  useEffect(() => {
    if (id) {
      console.log(id)
      dispatch(fetchProductById(id));
    }
  }, [dispatch, id]);

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">
        {productId ? "Edit product" : "Add Product"}
      </h3>
      <div>
        <Category />
      </div>
    </div>
  );
};

export default ListProduct;
