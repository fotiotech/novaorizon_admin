"use client";

import React, { useState, useEffect } from "react";
import { RootState } from "@/app/store/store";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Link from "next/link";
import { addProduct } from "@/app/store/slices/productSlice";

const Offer: React.FC = () => {
  const dispatch = useAppDispatch();

  // Access normalized product state
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0]; // Assuming the first product is being edited
  const product = productState.byId[productId] || {}; // Get the product by ID or fallback to an empty object

  // Local component state for inputs
  const [price, setPrice] = useState<number>(product.basePrice || 0);
  const [tax, setTax] = useState<number>(product.taxRate || 0);
  const [quantity, setQuantity] = useState<number>(product.stockQuantity || 0);
  const [discountValue, setDiscountValue] = useState<number>(
    product.discount || 0
  );
  const [finalPrice, setFinalPrice] = useState<number>(product.basePrice || 0); // Local state for finalPrice

  // Calculate final price based on price, tax, and discount
  useEffect(() => {
    const calculatedFinalPrice =
      price + (price * tax) / 100 - (price * discountValue) / 100;
    setFinalPrice(calculatedFinalPrice);
  }, [price, tax, discountValue]);

  // Dispatch updates to Redux store for price, tax, and discount
  useEffect(() => {
    dispatch(
      addProduct({
        _id: productId,
        basePrice: price,
        finalPrice: finalPrice,
        taxRate: tax,
        discount: discountValue,
        stockQuantity: quantity,
      })
    );
  }, [price, tax, discountValue, quantity, dispatch]);

  // Handle changes to price
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(Number(e.target.value));
  };

  // Handle changes to tax rate
  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTax(Number(e.target.value));
  };

  // Handle changes to discount
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setDiscountValue(value >= 0 && value <= 100 ? value : 0); // Ensure the discount is between 0 and 100
  };

  // Handle quantity change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(Number(e.target.value));
  };

  return (
    <div className="p-4 shadow-md rounded">
      <h2 className="text-lg font-semibold mb-4">
        Add Prices, Quantities, and Discount
      </h2>

      {/* Base Price */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Base Price</label>
        <input
          type="number"
          value={price}
          onChange={handlePriceChange}
          className="mt-1 block w-full border-gray-300 
          rounded-md shadow-sm focus:border-indigo-500
          bg-transparent focus:ring-indigo-500"
          placeholder="Enter base price"
        />
      </div>

      {/* Tax Rate */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Tax Rate (%)</label>
        <input
          type="number"
          value={tax}
          onChange={handleTaxChange}
          className="mt-1 block w-full border-gray-300 
          rounded-md shadow-sm focus:border-indigo-500
          bg-transparent focus:ring-indigo-500"
          placeholder="Enter tax rate"
        />
      </div>

      {/* Stock Quantity */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Stock Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={handleQuantityChange}
          className="mt-1 block w-full border-gray-300 
          rounded-md shadow-sm focus:border-indigo-500
          bg-transparent focus:ring-indigo-500"
          placeholder="Enter stock quantity"
        />
      </div>

      {/* Discount */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Discount (%)</label>
        <input
          type="number"
          value={discountValue}
          onChange={handleDiscountChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 bg-transparent focus:ring-indigo-500"
          placeholder="Enter discount percentage (0-100)"
        />
        <p className="text-sm text-gray-500 mt-1">
          Enter a value between 0 and 100 for the discount percentage.
        </p>
      </div>

      {/* Final Price (Read-only Display) */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Final Price</label>
        <p className="mt-1 block w-full text-gray-900 font-semibold bg-gray-100 rounded-md p-2">
          {finalPrice.toFixed(2)} {product.currency || "USD"}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center space-x-4 mt-6">
        <Link
          href={finalPrice ? "/products/list_product/information" : ""}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={finalPrice ? "/products/list_product/review_final" : ""}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Offer;
