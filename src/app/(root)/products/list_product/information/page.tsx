"use client";

import React, { useState } from "react";
import Select from "react-select";
import { ProductState, updateProduct } from "@/app/store/slices/productSlice"; // Assuming correct path to redux actions
import { RootState } from "@/app/store/store";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Link from "next/link";

const Information: React.FC = () => {
  const dispatch = useAppDispatch();

  // Select the current product state from the Redux store
  const { sku, productCode } = useAppSelector(
    (state: RootState) => state.product
  );

  // Local component state for product code type and value
  const [codeType, setCodeType] = useState("sku");
  const [codeValue, setCodeValue] = useState<string>(sku || "");

  // Handle product code type change with react-select
  const handleCodeTypeChange = (selectedOption: any) => {
    const newCodeType = selectedOption.value;
    setCodeType(newCodeType);
    // Reset the code value when the type changes
    setCodeValue("");
  };

  // Handle product code value change
  const handleCodeValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodeValue(e.target.value);
    dispatch(
      updateProduct({
        field: codeType as keyof ProductState,
        value: e.target.value,
      })
    );
  };

  // Options for react-select
  const codeTypeOptions = [
    { value: "sku", label: "SKU" },
    { value: "upc", label: "UPC" },
    { value: "ean", label: "EAN" },
    { value: "gtin", label: "GTIN" },
  ];

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "transparent", // Change the input background
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "#f0f9ff", // Change the dropdown menu background
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? "#e0f2fe" // Background when option is focused
        : "#f0f9ff", // Default background
    }),
  };

  return (
    <div className="p-4 shadow-md rounded">
      <h2 className="text-lg font-semibold mb-4">Product Details</h2>

      {/* Select Product Code Type (SKU, UPC, EAN, GTIN) with react-select */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          Select Product Code Type
        </label>
        <Select
          options={codeTypeOptions}
          styles={customStyles}
          value={codeTypeOptions.find((option) => option.value === codeType)}
          onChange={handleCodeTypeChange}
          className="mt-1 bg-none text-sec border-gray-100"
          placeholder="Select code type"
        />
      </div>

      {/* Product Code Value (Text Input) */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          Enter {codeType.toUpperCase()} Code
        </label>
        <input
          type="text"
          value={codeValue}
          onChange={handleCodeValueChange}
          className="mt-1 block w-full border-gray-300 
          bg-transparent rounded-md shadow-sm"
          placeholder={`Enter ${codeType.toUpperCase()} code`}
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-between items-center space-x-4 mt-6">
        <Link
          href={codeValue ? "/products/list_product/basic_infos" : ""}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={codeValue ? "/products/list_product/offer" : ""}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Information;
