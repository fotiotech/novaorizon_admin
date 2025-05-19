"use client";

import React, { useEffect, useState } from "react";
import Select from "react-select"; // Import react-select
import { findAttributesAndValues } from "@/app/actions/attributes";
import { RootState } from "@/app/store/store";
import {
  updateGetVariant,
  updateAttributes,
  addProduct,
} from "@/app/store/slices/productSlice";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Link from "next/link";
import { find_mapped_attributes_ids } from "@/app/actions/category";

type AttributeValue = {
  _id: string;
  attribute_id: string;
  value: string;
  __v: number;
};

type Attribute = {
  id: string;
  name: string;
  values: AttributeValue[];
  isBaseAttribute?: boolean;
  isVariant?: boolean;
};

type AttributeGroup = {
  groupName: string;
  attributes: Attribute[];
};

type CategoryAttributes = {
  categoryId: string;
  categoryName: string;
  groupedAttributes: AttributeGroup[];
};

const Details = () => {
  const dispatch = useAppDispatch();

  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];
  const product = productState.byId[productId] || {};

  const [attributes, setAttributes] = useState<any[]>([]);

  useEffect(() => {
    const fetchAttributes = async () => {
      if (product.category_id) {
        // Fetch all attributes without filtering
        const response = await find_mapped_attributes_ids(
          null,
          product.category_id
        );
        if (response?.length > 0) {
          setAttributes(response as any[]);
        }
      }
    };

    fetchAttributes();
  }, [product.category_id]);

  const handleAttributeChange = (
    groupName: string,
    attrName: string,
    selectedValues: string[] | null
  ) => {
    dispatch(
      updateAttributes({
        productId,
        groupName,
        attrName,
        selectedValues: selectedValues || [],
      })
    );
  };

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

  // Update the helper function to handle undefined values
  const getAttributeStyle = (isBaseAttribute: boolean | undefined) => ({
    label:
      isBaseAttribute !== false // treat undefined as true (base attribute)
        ? "text-blue-600 font-medium"
        : "text-green-600 font-medium",
    hint:
      isBaseAttribute !== false ? "(Base Attribute)" : "(Variant Attribute)",
  });

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "transparent", // Change the input background
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "#bbb", // Change the dropdown menu background
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? "#e0f2fe" // Background when option is focused
        : "#f0f9ff", // Default background
    }),
  };

  const attributeDetails = attributes.filter(
    (detail) => detail.groupId.group_order === 40
  );

  console.log("Attributes:", attributes);

  return (
    <div className="p-6 rounded-lg shadow-md">
      {attributeDetails.length > 0 &&
        attributeDetails.map((detail) => (
          <div key={detail._id} className=" mb-2">
            {detail.type === "text" && (
              <div className="flex flex-col">
                <label className="text-sm font-medium">{detail.name}:</label>
                <input
                  title={detail.name}
                  type="text"
                  className="border rounded p-2 mt-1 bg-transparent"
                  value={detail.name || ""}
                  onChange={(e) => handleChange(detail.name, e)}
                />
              </div>
            )}
            {detail.type === "select" && (
              <div className="flex flex-col">
                <label className="text-sm font-medium">{detail.name}:</label>
                <Select
                  id={detail.name}
                  value={detail.name}
                  // options={brandOptions as any}
                  onChange={(e) => handleChange(detail.name, e)}
                  isClearable
                  styles={customStyles}
                  className="mt-1 text-sec"
                />
              </div>
            )}
            {detail.type === "number" && (
              <div className="flex flex-col">
                <label className="text-sm font-medium">{detail.name}:</label>
                <input
                  title={detail.name}
                  type="text"
                  className="border rounded p-2 mt-1 bg-transparent"
                  value={detail.name || ""}
                  onChange={(e) => handleChange(detail.name, e)}
                />
              </div>
            )}
            {detail.type === "checkbox" && (
              <div>
                <label className="inline-flex items-center mb-4">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={product.getVariant || false}
                    onChange={(e) =>
                      dispatch(
                        updateGetVariant({ productId, value: e.target.checked })
                      )
                    }
                  />
                  <span className="ml-2">Enable Variants</span>
                </label>
              </div>
            )}
          </div>
        ))}

      <div className="flex justify-between items-center mt-6">
        <Link
          href={"/products/list_product/offer"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={"/products/list_product/variant"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Details;
