"use client";
import { createProduct, updateProduct } from "@/app/actions/products";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import React from "react";
import Link from "next/link";
import { RootState } from "@/app/store/store";
import { clearProduct } from "@/app/store/slices/productSlice";
import { persistor } from "@/app/store/store";
import { useRouter } from "next/navigation";

const AddProduct = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state: RootState) => state.product);
  const id = productState?.allIds[0];
  const product = productState?.byId[id] || {};

  const validateForm = () => {
    return product;
  };

  const clearStoreAndRedirect = async () => {
    // Clear Redux persisted data
    await persistor.purge();
    // Clear product state
    dispatch(clearProduct());
    // Redirect to products list
    router.push("/products/list_product");
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fill all required fields!");
      return;
    }

    try {
      if (id) {
        const res = await updateProduct(id, {
          attributes: product,
        });
        if (res) {
          alert("Product updated successfully!");
          await clearStoreAndRedirect();
        }
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      alert("Failed to submit the product. Please try again.");
    }
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
