"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { RootState } from "@/app/store/store";
import {
  updateProduct,
  initialState,
  setImageUrls,
} from "@/app/store/slices/productSlice";
import FilesUploader from "@/components/FilesUploader";
import { getBrands } from "@/app/actions/brand";
import { Brand } from "@/constant/types";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Link from "next/link";
import { useFileUploader } from "@/hooks/useFileUploader ";
import Spinner from "@/components/Spinner";
import Image from "next/image";

const BasicInformation = () => {
  const { files, loading, addFiles, removeFile } = useFileUploader();
  const dispatch = useAppDispatch();
  const {
    productId,
    sku,
    product_name,
    brand_id,
    department,
    description,
    imageUrls,
  } = useAppSelector((state: RootState) => state.product);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<{
    value: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      const res = await getBrands();
      setBrands(res);
    };
    fetchBrands();
  }, []);

  // Handle input changes (for text fields like sku, product_name, etc.)
  const handleChange = (
    field: keyof typeof initialState,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    dispatch(updateProduct({ field, value }));
  };

  useEffect(() => {
    if (files.length > 0) {
      const uploadedUrls = files.map((file: any) => file.url || file); // Adjust for file structure
      dispatch(setImageUrls(uploadedUrls));
    }
  }, [files, dispatch]);

  const handleBrandChange = (selectedOption: any) => {
    setSelectedBrand(selectedOption);
    dispatch(updateProduct({ field: "brand_id", value: selectedOption.value }));
  };

  const brandOptions = brands.map((brand) => ({
    value: brand._id,
    label: brand.name,
  }));

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

  console.log(imageUrls)

  return (
    <div className="space-y-6 mb-10">
      <div>
        <FilesUploader files={imageUrls} addFiles={addFiles} />
      </div>
      {/* Pass handleFilesChange to update image URLs */}
      <h2 className="text-2xl font-semibold">Basic Information</h2>
      <div className="flex flex-col">
        <label htmlFor="sku" className="text-sm font-medium">
          SKU
        </label>
        <input
          id="sku"
          type="text"
          value={sku}
          placeholder="Enter SKU"
          onChange={(e) => handleChange("sku", e)}
          className="border rounded p-2 mt-1 bg-transparent"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="product_name" className="text-sm font-medium">
          Product Name
        </label>
        <input
          id="product_name"
          type="text"
          value={product_name}
          placeholder="Enter Product Name"
          onChange={(e) => handleChange("product_name", e)}
          className="border rounded p-2 mt-1 bg-transparent"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="brand" className="text-sm font-medium">
          Brand
        </label>
        <Select
          id="brand"
          value={selectedBrand}
          options={brandOptions as any}
          onChange={handleBrandChange}
          isClearable
          styles={customStyles}
          className="mt-1 text-sec"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="department" className="text-sm font-medium">
          Department
        </label>
        <input
          id="department"
          type="text"
          value={department}
          placeholder="Enter Department"
          onChange={(e) => handleChange("department", e)}
          className="border rounded p-2 mt-1 bg-transparent"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="description" className="text-sm font-medium">
          Product Description
        </label>
        <textarea
          id="description"
          value={description}
          placeholder="Enter product description"
          onChange={(e) => handleChange("description", e)}
          className="border rounded p-2 mt-1 bg-transparent h-32"
        />
      </div>
      <div className="flex justify-between items-center space-x-4 mt-6">
        <Link
          href={product_name ? "/products/list_product/category" : ""}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={product_name ? "/products/list_product/information" : ""}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default BasicInformation;
