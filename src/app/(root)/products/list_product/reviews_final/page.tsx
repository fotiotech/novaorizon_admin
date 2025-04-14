"use client";
import { createProduct, updateProduct } from "@/app/actions/products";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import React, { useEffect, useState } from "react";
import { Product } from "@/constant/types";
import Link from "next/link";
import { RootState } from "@/app/store/store";
// import { persistor } from "@/app/store/store";

const AddProduct = () => {
  const productState = useAppSelector((state: RootState) => state.product);
  const id = productState?.allIds[0]; // Assuming the first product is being edited
  const product = productState?.byId[id] || {};
  console.log("product data:", product);
  const {
    _id,
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
    variantAttributes,
  } = product;

  const validateForm = () => {
    return (
      category_id &&
      attributes &&
      imageUrls.length > 0 &&
      sku &&
      product_name &&
      brand_id &&
      department &&
      description
    );
  };

  const handleSubmit = async () => {
    // if (validateForm()) {
    try {
      if (_id) {
        const res = await updateProduct( _id, {
          category_id,
          attributes,
          variants,
          imageUrls,
          sku,
          product_name,
          brand_id,
          department,
          description,
          basePrice,
          finalPrice,
          taxRate,
          discount,
          currency,
          productCode,
          stockQuantity,
          status,
          variantAttributes,
        } as unknown as any);
        if (res) {
          alert("Product updated successfully!");

          // Clear Redux persisted data and reset state
          //persistor.purge(); // Clear persisted data
          //dispatch(clearProduct()); // Reset Redux state
        }
      } else {
        const res = await createProduct({
          category_id,
          attributes,
          variants,
          imageUrls,
          sku,
          product_name,
          brand_id,
          department,
          description,
          basePrice,
          finalPrice,
          taxRate,
          discount,
          currency,
          productCode,
          stockQuantity,
          status,
          variantAttributes,
        } as unknown as any);
        if (res) {
          alert("Product submitted successfully!");

          // Clear Redux persisted data and reset state
          //persistor.purge(); // Clear persisted data
          //dispatch(clearProduct()); // Reset Redux state
        }
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      alert("Failed to submit the product. Please try again.");
    }
    // } else {
    //   alert("Please fill all required fields!");
    // }
  };

  return (
    <div>
      <div className="flex justify-between items-center space-x-4 mt-6">
        <Link
          href={"/products/list_product/variants"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <button
          title="submit"
          type="submit"
          onClick={handleSubmit}
          className="btn"
        >
          Save and Finish
        </button>
      </div>
    </div>
  );
};

export default AddProduct;
