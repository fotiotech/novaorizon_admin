"use client";

import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { findCategoryAttributesAndValues } from "@/app/actions/attributes";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  removeVariant,
  syncVariantWithParent,
  addVariant,
  updateVariantField,
  updateVariantAttributes,
} from "@/app/store/slices/productSlice";
import Link from "next/link";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import { RootState } from "@/app/store/store";

type AttributeType = {
  groupName: string;
  attributes: {
    attrName: string;
    attrValue: string[];
  }[];
};

type OptionType = { value: string; label: string };

const Variant = () => {
  const { files, addFiles } = useFileUploader();
  const dispatch = useAppDispatch();

  // Access normalized product state
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState?.allIds[0]; // Assuming the first product is being edited
  const product = productState?.byId[productId] || {}; // Get the product by ID or fallback to an empty object
  const { category_id, variants, variantAttributes } = product;

  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [imageIndex, setImageIndex] = useState<number | null>(null);

  const memoizedVariantAttributes = useMemo(
    () => variantAttributes,
    [variantAttributes]
  );

  const AttributesVariants = useMemo(() => {
    if (
      !memoizedVariantAttributes ||
      Object.keys(memoizedVariantAttributes).length === 0
    ) {
      return []; // Return an empty array if no data
    }
    return generateVariations(memoizedVariantAttributes);
  }, [memoizedVariantAttributes]);

  useEffect(() => {
    if (files.length > 0 && imageIndex !== null) {
      const uploadedUrls = files.map((file: any) => file.url || file); // Adjust for file structure
      dispatch(
        updateVariantField({
          productId,
          index: imageIndex,
          field: "imageUrls",
          value: uploadedUrls,
        })
      );
    }
  }, [files, imageIndex, dispatch]);

  useEffect(() => {
    const fetchAttributes = async () => {
      if (category_id) {
        const response = await findCategoryAttributesAndValues(category_id);
        if (response?.length > 0) {
          const formattedAttributes = response[0].groupedAttributes
            ?.filter((group: any) => group.groupName === "General")
            ?.map((group: any) => ({
              groupName: group.groupName
                ? group.groupName.toLowerCase()
                : "additional details",
              attributes: group.attributes?.map((attr: any) => ({
                attrName: attr.attributeName,
                attrValue: attr.attributeValues?.map((val: any) => val.value),
              })),
            }));
          setAttributes(formattedAttributes);
        }
      }
    };

    fetchAttributes().catch((error) => console.error(error));
  }, [category_id]);

  const handleAttributeChange = (
    idx: number,
    groupName: string,
    attrName: string,
    selectedValues: string[] | null
  ) => {
    dispatch(
      updateVariantAttributes({
        productId,
        groupName,
        attrName,
        selectedValues: selectedValues || [],
      })
    );

    // Generate new variants based on updated attributes
    const updatedVariants = generateVariations({
      ...variantAttributes,
      [groupName]: {
        ...variantAttributes[groupName],
        [attrName]: selectedValues || [],
      },
    });

    // Dispatch each variant to Redux using addVariant
    updatedVariants.forEach((variant) => {
      dispatch(
        addVariant({
          productId,
          variant,
        })
      );
    });

    // Optionally synchronize with parent
    dispatch(syncVariantWithParent({ productId }));
  };

  function generateVariations(variantAttributesData: {
    [groupName: string]: { [attributeName: string]: string[] };
  }) {
    if (
      !variantAttributesData ||
      Object.keys(variantAttributesData).length === 0
    ) {
      return []; // Return an empty array if input is empty or undefined
    }

    // Step 1: Flatten the attributes into an array of attribute groups
    const attributeGroups = Object.entries(variantAttributesData).flatMap(
      ([groupName, attributes]) =>
        Object.entries(attributes).map(([attrName, attrValues]) => ({
          groupName,
          attrName,
          attrValues,
        }))
    );

    // Step 2: Generate Cartesian product of attribute values
    const cartesianProduct = (arrays: string[][]): string[][] =>
      arrays.reduce(
        (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
        [[]] as string[][]
      );

    const attributeValues = attributeGroups.map((group) => group.attrValues);
    const combinations = cartesianProduct(attributeValues);

    // Step 3: Map combinations to variant objects
    return combinations.map((combination) => {
      const variant: Record<string, string> = {};
      combination.forEach((value, index) => {
        const { attrName } = attributeGroups[index];
        variant[attrName] = value;
      });
      return {
        ...variant,
        variantName: "",
        sku: "",
        basePrice: 0,
        finalPrice: 0,
        taxRate: 0,
        discount: 0,
        currency: "",
        stockQuantity: 0,
        imageUrls: [],
        status: "active",
      };
    });
  }

  const handleRemoveVariant = (index: number) => {
    dispatch(removeVariant({ productId, index }));
  };

  const handleVariantChange = (
    index: number,
    field: string,
    value: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const finalValue =
      typeof value === "string"
        ? value
        : (value.target as HTMLInputElement).value;

    if (!productId) {
      console.error("Product ID is undefined. Cannot update variant field.");
      return;
    }

    dispatch(
      updateVariantField({
        productId,
        index,
        field,
        value: finalValue,
      })
    );
  };

  const handleAttributeSelect = (attrName: string) => {
    setSelectedAttributes((prevSelected) => {
      if (prevSelected.includes(attrName)) {
        return prevSelected.filter((name) => name !== attrName); // Deselect
      } else {
        return [...prevSelected, attrName]; // Select
      }
    });
  };

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "transparent",
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "#f0f9ff",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#e0f2fe" : "#f0f9ff",
    }),
  };

  const codeTypeOptions: OptionType[] = [
    { value: "sku", label: "SKU" },
    { value: "upc", label: "UPC" },
    { value: "ean", label: "EAN" },
    { value: "gtin", label: "GTIN" },
  ];

  console.log("variants:", variants);
  console.log("AttributesVariants:", AttributesVariants);
  console.log("attributes:", attributes);
  console.log("variantAttributes:", variantAttributes);

  return (
    <div className="p-3 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-pri capitalize mb-4">
        Variant
      </h3>

      {/* Attribute Selection */}
      <div>
        {attributes.length > 0 && (
          <>
            {attributes.map((group) => (
              <div key={group.groupName} className="mb-6">
                {group.attributes.map((attribute) => (
                  <div key={attribute.attrName} className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      {attribute.attrName}
                    </label>
                    <Select
                      options={attribute.attrValue.map((value) => ({
                        label: value,
                        value,
                      }))}
                      isMulti
                      styles={customStyles}
                      className="bg-none text-sec border-gray-100"
                      classNamePrefix="select"
                      onChange={(selected) =>
                        handleAttributeChange(
                          0,
                          group.groupName,
                          attribute.attrName,
                          selected?.map((option) => option.value) || null
                        )
                      }
                      placeholder={`Select ${attribute.attrName}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Variant Management */}
      <div className="rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-pri capitalize mb-4">
          Variant Management
        </h3>

        {variants?.map((variant: any, index: number) => (
          <div key={index} className="mt-10">
            {/* File Uploader for Images */}
            <FilesUploader
              files={variant.imageUrls || []}
              addFiles={(newFiles) => {
                setImageIndex(index);
                addFiles(newFiles);
              }}
            />

            {/* SKU Field */}
            <div className="mt-4">
              <label className="block text-sm font-medium">SKU</label>
              <input
                type="text"
                value={variant.sku || ""}
                onChange={(e) => handleVariantChange(index, "sku", e)}
                className="mt-1 block w-full border-gray-300 bg-transparent rounded-md shadow-sm"
                placeholder="Enter SKU"
              />
            </div>

            {/* Base Price Field */}
            <div className="mt-4">
              <label className="block text-sm font-medium">Base Price</label>
              <input
                type="number"
                value={variant.basePrice || 0}
                onChange={(e) => handleVariantChange(index, "basePrice", e)}
                className="mt-1 block w-full border-gray-300 bg-transparent rounded-md shadow-sm"
                placeholder="Enter Base Price"
              />
            </div>

            {/* Final Price Field */}
            <div className="mt-4">
              <label className="block text-sm font-medium">Final Price</label>
              <input
                type="number"
                value={variant.finalPrice || 0}
                onChange={(e) => handleVariantChange(index, "finalPrice", e)}
                className="mt-1 block w-full border-gray-300 bg-transparent rounded-md shadow-sm"
                placeholder="Enter Final Price"
              />
            </div>

            {/* Stock Quantity Field */}
            <div className="mt-4">
              <label className="block text-sm font-medium">
                Stock Quantity
              </label>
              <input
                type="number"
                value={variant.stockQuantity || 0}
                onChange={(e) => handleVariantChange(index, "stockQuantity", e)}
                className="mt-1 block w-full border-gray-300 bg-transparent rounded-md shadow-sm"
                placeholder="Enter Stock Quantity"
              />
            </div>

            {/* Status Field */}
            <div className="mt-4">
              <label className="block text-sm font-medium">Status</label>
              <select
                name="status"
                title='status'
                value={variant.status || "active"}
                onChange={(e) =>
                  handleVariantChange(index, "status", e.target.value)
                }
                className="mt-1 block w-full border-gray-300 bg-transparent rounded-md shadow-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-6">
        <Link
          href={"/products/list_product/details"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={"/products/list_product/inventory"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Variant;
