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

type AttributeType = {
  groupName: string;
  attributes: {
    attrName: string;
    attrValue: string[];
  }[];
};

const Details = () => {
  const dispatch = useAppDispatch();
  const { category_id, getVariant } = useAppSelector(
    (state: RootState) => state.product
  );
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [isVariant, setIsVariant] = useState<boolean>(false);

  useEffect(() => {
    const fetchAttributes = async () => {
      if (category_id !== "") {
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

    fetchAttributes();
  }, [category_id]);

  const handleAttributeChange = (
    groupName: string,
    attrName: string,
    selectedValues: string[] | null
  ) => {
    dispatch(
      updateAttributes({
        groupName,
        attrName,
        selectedValues: selectedValues || [],
      })
    );
  };


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
    <div className="p-6  rounded-lg shadow-md">
      <label className="inline-flex items-center">
        <input
          type="checkbox"
          className="form-checkbox"
          checked={getVariant}
          onChange={(e) => dispatch(updateGetVariant(e.target.checked))}
        />
        <span className="ml-2">Is it get Variant?</span>
      </label>

      {attributes.length > 0 && (
        <>
          {attributes.map((group) => (
            <div key={group.groupName} className="mb-6">
              <h3 className="text-lg font-semibold text-pri capitalize mb-4">
                Details
              </h3>
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

          <div className="flex justify-between items-center mt-6">
            {/* Back Button */}
            <Link
              href={"/products/list_product/offer"}
              className="bg-blue-500 text-white p-2 rounded"
            >
              Back
            </Link>
            <Link
              href={
                getVariant
                  ? "/products/list_product/variants"
                  : "/products/list_product/inventory"
              }
              className="bg-blue-500 text-white p-2 rounded"
            >
              Next
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Details;
