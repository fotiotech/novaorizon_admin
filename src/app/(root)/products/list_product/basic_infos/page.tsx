"use client";

import React, { useState, useEffect } from "react";
import Select, { MultiValue } from "react-select";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { persistor, RootState } from "@/app/store/store";
import {
  addProduct,
  clearProduct,
  updateAttributes,
} from "@/app/store/slices/productSlice";
import FilesUploader from "@/components/FilesUploader";
import { getBrands } from "@/app/actions/brand";
import { Brand } from "@/constant/types";
import { find_mapped_attributes_ids } from "@/app/actions/category";
import { useFileUploader } from "@/hooks/useFileUploader";
import { updateProduct, createProduct } from "@/app/actions/products";
import router from "next/router";
import { v4 as uuidv4, validate, version } from "uuid";

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

const ProductForm = () => {
  const { files, addFiles } = useFileUploader();
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];
  const product = productState.byId[productId] || {};

  const validateForm = () => {
    return Boolean(product.category_id) && attributes.length > 0;
  };

  const clearStoreAndRedirect = async () => {
    // Clear Redux persisted data
    await persistor.purge();
    // Clear product state
    dispatch(clearProduct());
    // Redirect to products list
    router.push("/products/list_product");
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fill all required fields!");
      return;
    }

    try {
      if (productId && !validate(productId) && version(productId) !== 4) {
        const res = await updateProduct(productId, {
          category_id: product.category_id,
          attributes,
        });
        if (res) {
          alert("Product updated successfully!");
          await clearStoreAndRedirect();
        }
      } else {
        const res = await createProduct({
          category_id: product.category_id,
          attributes,
        });
        if (res) {
          alert("Product submitted successfully!");
          await clearStoreAndRedirect();
        }
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      alert("Failed to submit the product. Please try again.");
    }
  };

  async function clearStore() {
    await clearStoreAndRedirect();
  }

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [attributes, setAttributes] = useState<AttributeDetail[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  // fetch attributes
  useEffect(() => {
    const fetchAttributes = async () => {
      if (product.category_id) {
        const resp = await find_mapped_attributes_ids(
          null,
          product.category_id
        );
        if (Array.isArray(resp)) setAttributes(resp as AttributeDetail[]);
      }
    };
    fetchAttributes();
  }, [product.category_id]);

  // fetch brands
  useEffect(() => {
    getBrands().then((res) => setBrands(res));
  }, []);

  // compute sorted unique group_orders
  const groupOrders = React.useMemo(() => {
    const orders = Array.from(
      new Set(attributes.map((a) => a.groupId.group_order))
    );
    return orders.sort((a, b) => a - b);
  }, [attributes]);

  // determine current group_order
  const currentOrder = groupOrders[stepIndex] ?? null;

  // filter attributes for this step
  const currentAttrs = attributes.filter(
    (a) => a.groupId.group_order === currentOrder
  );

  // handle switching field values
  const handleAttributeChange = (
    groupName: string,
    attrName: string,
    selected: any
  ) => {
    dispatch(
      updateAttributes({
        productId,
        groupName,
        attrName,
        selectedValues: selected,
      })
    );
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (stepIndex < groupOrders.length - 1) setStepIndex((idx) => idx + 1);
    else {
      // final submit logic here
      handleSubmit();
    }
  };

  const handlePrev = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  console.log("product:", product);

  const uniqueAttrs = attributes.filter(
    (item, i, arr) =>
      arr.findIndex((a) => a.groupId.name === item.groupId.name) === i
  );

  return (
    <form onSubmit={handleNext} className="space-y-6 mb-10">
      {/* <div className=" whitespace-nowrap overflow-x-auto">
        {uniqueAttrs.map((a) => (
          <h3
            key={a.groupId._id as string}
            className=" inline-block mx-3 font-semibold"
          >
            {a.groupId.name}
          </h3>
        ))}
      </div> */}
      {currentAttrs.length > 0 && (
        <div className="group-section">
          <h3 className="text-lg font-semibold mb-3">
            {
              attributes.find((a) => a.groupId.group_order === currentOrder)
                ?.groupId.name
            }
          </h3>
          {currentAttrs.map((detail) => {
            const groupName = detail.groupId.name;
            const attrName = detail.name;
            const stored = product.attributes?.[groupName]?.[attrName];
            if (detail.type === "file") {
              handleAttributeChange(groupName, attrName, files);
            }

            return (
              <div key={detail._id} className="mb-4">
                <label className="block mb-1">{detail.name}</label>
                {detail.type === "file" && (
                  <div>
                    <FilesUploader files={stored || []} addFiles={addFiles} />
                  </div>
                )}
                {detail.type === "text" && (
                  <input
                    title="text"
                    type="text"
                    className="w-full"
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
                    className="w-full"
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
                    styles={{
                      control: (prov) => ({
                        ...prov,
                        backgroundColor: "transparent",
                      }),
                      menu: (prov) => ({ ...prov, backgroundColor: "#f0f9ff" }),
                      option: (prov, state) => ({
                        ...prov,
                        backgroundColor: state.isFocused
                          ? "#e0f2fe"
                          : "#f0f9ff",
                      }),
                    }}
                  />
                )}
                {detail.type === "select" && detail.name === "Brand" && (
                  <Select
                    value={selectedBrand}
                    options={brands.map((b) => ({
                      value: b._id,
                      label: b.name,
                    }))}
                    onChange={(opt) => {
                      setSelectedBrand(opt);
                      dispatch(
                        addProduct({ _id: productId, brand_id: opt?.value })
                      );
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={stepIndex === 0}
          className="btn px-6"
          style={{ backgroundColor: stepIndex === 0 ? "#ccc" : "#007bff" }}
        >
          Previous
        </button>
        <div className="flex gap-6">
          <button
            type="button"
            onClick={clearStore}
            className="border p-2 bg-gray-400 rounded-lg"
          >
            Cancel
          </button>
          <button type="submit" className="btn px-6">
            {stepIndex < groupOrders.length - 1 ? "Next" : "Save & Submit"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
