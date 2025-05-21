"use client";

import React, { useState, useEffect } from "react";
import Select, { MultiValue } from "react-select";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { addProduct, updateAttributes } from "@/app/store/slices/productSlice";
import FilesUploader from "@/components/FilesUploader";
import { getBrands } from "@/app/actions/brand";
import { Brand } from "@/constant/types";
import Link from "next/link";
import { useFileUploader } from "@/hooks/useFileUploader";
import { find_mapped_attributes_ids } from "@/app/actions/category";

type AttributeValue = {
  _id: string;
  attribute_id: string;
  value: string;
  __v: number;
};

type AttributeDetail = {
  _id: string;
  name: string;
  type: string;
  values?: AttributeValue[];
  groupId: { name: string; group_order: number };
};

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
  const [attributes, setAttributes] = useState<AttributeDetail[]>([]);

  useEffect(() => {
    const fetchAttributes = async () => {
      if (product.category_id) {
        const response = await find_mapped_attributes_ids(
          null,
          product.category_id
        );
        if (response?.length > 0) {
          setAttributes(response as AttributeDetail[]);
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

  const handleAttributeChange = (
    groupName: string,
    attrName: string,
    selectedValues: any
  ) => {
    dispatch(
      updateAttributes({ productId, groupName, attrName, selectedValues })
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

  const attributeDetails = attributes.filter(
    (attr) => attr.groupId.group_order === 10
  );

  console.log('attributeDetails:', attributeDetails);

  return (
    <div className="space-y-6 mb-10">
      {attributeDetails.length > 0 &&
        attributeDetails.map((detail) => {
          const groupName = detail.groupId.name;
          const attrName = detail.name;
          // current stored value (could be single or array)
          const stored = product.attributes?.[groupName]?.[attrName];

          return (
            <div key={detail._id} className="mb-4">
              <label className="text-sm font-medium block mb-1">
                {detail.name}:
              </label>

              {detail.type === "file" && (
                <div>
                  <FilesUploader files={stored || []} addFiles={addFiles} />
                </div>
              )}
              {detail.type === "text" && (
                <input
                  title="text"
                  type="text"
                  className="border rounded p-2 w-full bg-transparent"
                  value={stored || ""}
                  onChange={(e) =>
                    handleAttributeChange(groupName, attrName, e.target.value)
                  }
                />
              )}

              {detail.type === "number" && (
                <input
                  title="number"
                  type="number"
                  className="border rounded p-2 w-full bg-transparent"
                  value={stored || 0}
                  onChange={(e) =>
                    handleAttributeChange(
                      groupName,
                      attrName,
                      Number(e.target.value)
                    )
                  }
                />
              )}

              {detail.type === "select" && detail.values && (
                <Select
                  isMulti
                  options={detail.values.map((v) => ({
                    value: v.value,
                    label: v.value,
                  }))}
                  value={
                    Array.isArray(stored)
                      ? detail.values
                          .filter((v) => (stored as any[]).includes(v.value))
                          .map((v) => ({ value: v.value, label: v.value }))
                      : []
                  }
                  onChange={(
                    opts: MultiValue<{ value: string; label: string }>
                  ) =>
                    handleAttributeChange(
                      groupName,
                      attrName,
                      opts.map((o) => o.value)
                    )
                  }
                  isClearable
                  styles={customStyles}
                  className="mt-1 text-sec"
                />
              )}
              {detail.type === "select" &&
                detail.name === "Brand" && (
                  <Select
                    id="brand"
                    value={selectedBrand}
                    options={brandOptions as any}
                    onChange={handleBrandChange}
                    isClearable
                    styles={customStyles}
                    className="mt-1 text-sec"
                  />
                )}
            </div>
          );
        })}

      <div className="flex justify-between items-center space-x-4 mt-6">
        <Link
          href={"/products/list_product/category"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={"/products/list_product/details"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default BasicInformation;
