"use client";

import React, { useEffect, useState } from "react";
import Select from "react-select";
import { findCategoryVariantAttributes } from "@/app/actions/attributes";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  removeVariant,
  addVariant,
  updateVariantField,
  updateVariantAttributes,
  syncVariantWithParent,
} from "@/app/store/slices/productSlice";
import Link from "next/link";
import VariantFileUploader from "@/components/products/VariantFileUploader";
import { RootState } from "@/app/store/store";

type AttributeType = {
  groupName: string;
  attributes: {
    attrName: string;
    attrValue: string[];
    isVariant?: boolean;
  }[];
};

interface VariantType {
  sku: string;
  variantName: string;
  basePrice: number;
  finalPrice: number;
  taxRate: number;
  discount: number;
  currency: string;
  stockQuantity: number;
  imageUrls: string[];
  status: "active" | "inactive";
  [key: string]: any;
}

const Variants = () => {
  const dispatch = useAppDispatch();

  // Access product from Redux store
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState?.allIds[0];
  const product = productState?.byId[productId] || {};
  const { category_id, variants = [], variantAttributes = {} } = product;

  const [attributes, setAttributes] = useState<AttributeType[]>([]);

  // Fetch variant attributes when category changes
  useEffect(() => {
    const fetchAttributes = async () => {
      if (category_id) {
        const response = await findCategoryVariantAttributes(category_id);
        if (response?.[0]?.groupedAttributes) {
          setAttributes(
            response[0].groupedAttributes.map((group: any) => ({
              groupName: group.groupName,
              attributes: group.attributes
                .filter((attr: any) => attr.isVariant)
                .map((attr: any) => ({
                  attrName: attr.name,
                  attrValue: attr.values.map((v: any) => v.value),
                  isVariant: true,
                })),
            }))
          );
        }
      }
    };
    fetchAttributes();
  }, [category_id]);

  const generateVariantCombinations = (selectedAttributes: {
    [key: string]: { [key: string]: string[] };
  }) => {
    // Get all groups and their attributes
    const allAttributes: { [key: string]: string[] } = {};

    // Flatten the nested structure into a single level of attributes
    Object.values(selectedAttributes).forEach((group) => {
      Object.entries(group).forEach(([attrName, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          allAttributes[attrName] = values;
        }
      });
    });

    const attributeNames = Object.keys(allAttributes);
    if (attributeNames.length === 0) return [];

    const combinations = [{}];
    attributeNames.forEach((attrName) => {
      const values = allAttributes[attrName];
      if (!Array.isArray(values) || values.length === 0) return;

      const newCombinations: any[] = [];
      combinations.forEach((combo) => {
        values.forEach((value) => {
          newCombinations.push({ ...combo, [attrName]: value });
        });
      });
      combinations.length = 0;
      combinations.push(...newCombinations);
    });

    return combinations;
  };

  const handleAttributeChange = (
    groupName: string,
    attrName: string,
    selectedValues: string[] | null
  ) => {
    if (!productId) return;

    // Initialize the group if it doesn't exist
    const currentAttributes = {
      ...variantAttributes,
      [groupName]: {
        ...(variantAttributes[groupName] || {}),
      },
    };

    // Update variant attributes in Redux
    dispatch(
      updateVariantAttributes({
        productId,
        groupName,
        attrName,
        selectedValues: selectedValues || [],
      })
    );

    // Create new variants based on all selected attributes
    const updatedAttributes = {
      ...currentAttributes,
      [groupName]: {
        ...currentAttributes[groupName],
        [attrName]: selectedValues || [],
      },
    };

    // Generate variant combinations only if there are selected values
    if (selectedValues && selectedValues.length > 0) {
      const combinations = generateVariantCombinations(updatedAttributes);

      // Create variant objects and update Redux
      combinations.forEach((combination) => {
        const variant: VariantType = {
          ...combination,
          sku: "",
          variantName: Object.entries(combination)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" - "),
          basePrice: product.basePrice || 0,
          finalPrice: product.finalPrice || 0,
          taxRate: product.taxRate || 0,
          discount: product.discount || 0,
          currency: product.currency || "",
          stockQuantity: 0,
          imageUrls: [],
          status: "active",
        };

        dispatch(addVariant({ productId, variant }));
      });

      // Sync variants with parent product
      dispatch(syncVariantWithParent({ productId }));
    }
  };

  const handleRemoveVariant = (index: number) => {
    if (!productId) return;
    dispatch(removeVariant({ productId, index }));
  };

  const handleVariantChange = (
    index: number,
    field: string,
    value:
      | string
      | number
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!productId) return;

    const finalValue = typeof value === "object" ? value.target.value : value;
    dispatch(
      updateVariantField({
        productId,
        index,
        field,
        value: finalValue,
      })
    );
  };

  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "transparent",
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#f0f9ff",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#e0f2fe" : "#f0f9ff",
    }),
  };

  return (
    <div className="p-3 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-pri capitalize mb-4">
        Variants
      </h3>

      {/* Attribute Selection */}
      <div>
        {attributes.map((group) => (
          <div key={group.groupName} className="mb-6">
            <h4 className="font-medium mb-2">{group.groupName}</h4>
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
                  onChange={(selected) =>
                    handleAttributeChange(
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
      </div>

      {/* Variant List */}
      <div className="mt-8">
        <h4 className="font-medium mb-4">Generated Variants</h4>
        {variants.map((variant: VariantType, index: number) => (
          <div key={index} className="border p-4 rounded-lg mb-4">
            <div className="flex justify-between mb-4">
              <h5 className="font-medium">{variant.variantName}</h5>
              <button
                onClick={() => handleRemoveVariant(index)}
                className="text-red-500"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <VariantFileUploader
                productId={productId}
                variantIndex={index}
                initialFiles={variant.imageUrls || []}
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">SKU</label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => handleVariantChange(index, "sku", e)}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-transparent"
                    placeholder="Enter SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Base Price
                  </label>
                  <input
                    type="number"
                    value={variant.basePrice}
                    onChange={(e) => handleVariantChange(index, "basePrice", e)}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-transparent"
                    title="Base price for variant"
                    placeholder="Enter base price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Final Price
                  </label>
                  <input
                    type="number"
                    value={variant.finalPrice}
                    onChange={(e) =>
                      handleVariantChange(index, "finalPrice", e)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 bg-transparent"
                    title="Final price for variant"
                    placeholder="Enter final price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={variant.stockQuantity}
                    onChange={(e) =>
                      handleVariantChange(index, "stockQuantity", e)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 bg-transparent"
                    title="Stock quantity for variant"
                    placeholder="Enter stock quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Status</label>
                  <select
                    value={variant.status}
                    onChange={(e) =>
                      handleVariantChange(index, "status", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 bg-transparent"
                    title="Status of variant"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Link
          href="/products/list_product/details"
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href="/products/list_product/inventory"
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Variants;
