"use client";

import React, { useState, useEffect } from "react";
import Select from "react-select";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { addProduct } from "@/app/store/slices/productSlice";
import FilesUploader from "@/components/FilesUploader";
import { getBrands } from "@/app/actions/brand";
import { Brand } from "@/constant/types";
import Link from "next/link";
import { useFileUploader } from "@/hooks/useFileUploader";
import { find_mapped_attributes_ids } from "@/app/actions/category";

const BasicInformation = () => {
  const { files, addFiles } = useFileUploader();
  const dispatch = useAppDispatch();

  // Access normalized product state
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0]; // Assuming the first product is being edited
  const product = productState.byId[productId] || {}; // Get the product by ID or fallback to an empty object

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [attributes, setAttributes] = useState<any[]>([]);
  
    useEffect(() => {
      const fetchAttributes = async () => {
        if (product.category_id) {
          // Fetch all attributes without filtering
          const response = await find_mapped_attributes_ids(null,
            product.category_id
          );
          if (response?.length > 0) {
            
            setAttributes(response as any[]);
          }
        }
      };
  
      fetchAttributes();
    }, [product.category_id]);

  useEffect(() => {
    const fetchBrands = async () => {
      const res = await getBrands();
      setBrands(res);
    };
    fetchBrands();
  }, []);

  // Handle input changes (for text fields like sku, product_name, etc.)
  const handleChange = (
    field: keyof typeof product,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    dispatch(
      addProduct({
        _id: productId,
        [field]: value,
      })
    );
  };

  useEffect(() => {
    if (files.length > 0) {
      const uploadedUrls = files.map((file: any) => file.url || file); // Adjust for file structure
      console.log("uploadedUrls:", uploadedUrls);

      // Check if the uploadedUrls are different from the current imageUrls in the Redux state
      if (
        JSON.stringify(uploadedUrls) !==
        JSON.stringify(productState.byId[productId]?.imageUrls || [])
      ) {
        dispatch(
          addProduct({
            _id: productId,
            imageUrls: uploadedUrls,
          })
        );
      }
    }
  }, [files, dispatch, productId, productState.byId]);

  const handleBrandChange = (selectedOption: any) => {
    setSelectedBrand(selectedOption);
    dispatch(
      addProduct({
        _id: productId,
        brand_id: selectedOption.value,
      })
    );
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

  console.log('attributes:', attributes);

  return (
    <div className="space-y-6 mb-10">
      {}
      <div>
        <FilesUploader files={product.imageUrls || []} addFiles={addFiles} />
      </div>
      <h2 className="text-2xl font-semibold">Basic Information</h2>
      <div className="flex flex-col">
        <label htmlFor="sku" className="text-sm font-medium">
          SKU
        </label>
        <input
          id="sku"
          type="text"
          name="sku"
          value={product.sku || ""}
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
          value={product.productName || ""}
          placeholder="Enter Product Name"
          onChange={(e) => handleChange("productName", e)}
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
          value={product.department || ""}
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
          value={product.description || ""}
          placeholder="Enter product description"
          onChange={(e) => handleChange("description", e)}
          className="border rounded p-2 mt-1 bg-transparent h-32"
        />
      </div>
      <div className="flex justify-between items-center space-x-4 mt-6">
        <Link
          href={product.product_name ? "/products/list_product/category" : ""}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={
            product.product_name
              ? "/products/list_product/information"
              : "/products/list_product/information"
          }
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default BasicInformation;
