"use client";

import React, { useEffect, useState } from "react";
import Select from "react-select"; // Import react-select
import { findCategoryAttributesAndValues } from "@/app/actions/attributes";
import { RootState } from "@/app/store/store";
import {
  updateGetVariant,
  updateAttributes,
} from "@/app/store/slices/productSlice";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Link from "next/link";

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

  const [attributes, setAttributes] = useState<AttributeGroup[]>([]);

  useEffect(() => {
    const fetchAttributes = async () => {
      if (product.category_id) {
        // Fetch all attributes without filtering
        const response = await findCategoryAttributesAndValues(
          product.category_id
        );
        if (response?.length > 0) {
          // Transform the attributes to show main product attributes
          const transformedGroups = response[0].groupedAttributes.map(
            (group: AttributeGroup) => ({
              ...group,
              // For the details page, we show all attributes since the main product can have both types
              attributes: group.attributes.map((attr: Attribute) => ({
                ...attr,
                // Mark if this is a variant attribute (will be used for UI hints)
                isBaseAttribute:
                  attr.isVariant === undefined ? true : !attr.isVariant,
              })),
            })
          );
          setAttributes(transformedGroups);
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
      backgroundColor: "#f0f9ff", // Change the dropdown menu background
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? "#e0f2fe" // Background when option is focused
        : "#f0f9ff", // Default background
    }),
  };

  console.log("Attributes:", attributes);

  return (
    <div className="p-6 rounded-lg shadow-md">
      <label className="inline-flex items-center mb-4">
        <input
          type="checkbox"
          className="form-checkbox"
          checked={product.getVariant || false}
          onChange={(e) =>
            dispatch(updateGetVariant({ productId, value: e.target.checked }))
          }
        />
        <span className="ml-2">Enable Variants</span>
      </label>

      {attributes.length > 0 && (
        <>
          {attributes.map((group) => (
            <div key={group.groupName} className="mb-6">
              <h3 className="text-lg font-semibold text-pri capitalize mb-4">
                {group.groupName}
              </h3>
              {group.attributes.map((attribute) => {
                const style = getAttributeStyle(attribute.isBaseAttribute);
                return (
                  <div key={attribute.id} className="mb-4">
                    <label className={`block text-sm mb-2 ${style.label}`}>
                      {attribute.name}{" "}
                      <span className="text-xs ml-2">{style.hint}</span>
                    </label>
                    <Select
                      options={attribute.values.map((value) => ({
                        label: value.value,
                        value: value.value,
                      }))}
                      isMulti
                      styles={customStyles}
                      className="bg-none text-sec border-gray-100"
                      classNamePrefix="select"
                      onChange={(selected) =>
                        handleAttributeChange(
                          group.groupName,
                          attribute.name,
                          selected?.map((option) => option.value) || null
                        )
                      }
                      placeholder={`Select ${attribute.name}`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      <div className="flex justify-between items-center mt-6">
        <Link
          href={"/products/list_product/offer"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={"/products/list_product/variants"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Details;
