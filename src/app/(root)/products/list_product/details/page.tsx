"use client";

import React, { useEffect, useState } from "react";
import Select, { MultiValue } from "react-select";
import { find_mapped_attributes_ids } from "@/app/actions/category";
import { RootState } from "@/app/store/store";
import {
  updateGetVariant,
  updateAttributes,
  addProduct,
} from "@/app/store/slices/productSlice";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Link from "next/link";

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

const Details: React.FC = () => {
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];
  const product = productState.byId[productId] || {};

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

  const handleAttributeChange = (
    groupName: string,
    attrName: string,
    selectedValues: any
  ) => {
    dispatch(
      updateAttributes({ productId, groupName, attrName, selectedValues })
    );
  };

  const handleChange = (
    field: keyof typeof product,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    dispatch(addProduct({ _id: productId, [field]: event.target.value }));
  };

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "transparent",
    }),
    menu: (provided: any) => ({ ...provided, backgroundColor: "#bbb" }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#e0f2fe" : "#f0f9ff",
    }),
  };

  const attributeDetails = attributes.filter(
    (attr) => attr.groupId.group_order === 40
  );

  console.log("product:", product);

  return (
    <div className="p-6 rounded-lg shadow-md">
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
            </div>
          );
        })}

      <label className="inline-flex items-center">
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

      <div className="flex justify-between items-center mt-6">
        <Link
          href="/products/list_product/offer"
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href="/products/list_product/variants"
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Details;
