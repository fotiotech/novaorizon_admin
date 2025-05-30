"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { persistor, RootState } from "@/app/store/store";
import { addProduct, clearProduct } from "@/app/store/slices/productSlice";
import { getBrands } from "@/app/actions/brand";
import { Brand } from "@/constant/types";
import { find_mapped_attributes_ids } from "@/app/actions/category";
import { updateProduct, createProduct } from "@/app/actions/products";
import router from "next/router";
import { v4 as uuidv4, validate, version } from "uuid";
import { Box, CircularProgress } from "@mui/material";
import MainImageUploader from "@/components/products/MainImageUploader";
import GalleryUploader from "@/components/products/GalleryUploader";

type AttributeDetail = {
  _id: string;
  name: string;
  option?: string[];
  type: string;
};

type GroupNode = {
  _id: string;
  name: string;
  parent_id: string;
  group_order: number;
  subgroups: GroupNode[];
  attributes: AttributeDetail[];
};

const ProductForm = () => {
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];
  const product = productState.byId[productId] || {};

  const clearStoreAndRedirect = async () => {
    await persistor.purge();
    dispatch(clearProduct());
    router.push("/products/list_product");
  };

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAttributes = async () => {
      setIsLoading(true);
      if (product.category_id) {
        const resp = await find_mapped_attributes_ids(
          null,
          product.category_id
        );
        setGroups(resp as unknown as GroupNode[]);
      }
      setIsLoading(false);
    };
    fetchAttributes();
  }, [product.category_id]);

  useEffect(() => {
    getBrands().then((res) => setBrands(res));
  }, []);

  const handleChange = (group: string, field: string, value: any) => {
    dispatch(
      addProduct({
        _id: productId,
        path: `${group}.${field}`,
        value,
      })
    );
  };

  const handleDimensionChange = (
    group: string,
    field: string,
    subfield: string,
    value: any
  ) => {
    dispatch(
      addProduct({
        _id: productId,
        path: `${group}.${field}.${subfield}`,
        value,
      })
    );
  };

  const handleSubmit = async () => {
    const isLocalId = validate(productId) && version(productId) === 4;
    try {
      let res;
      if (!isLocalId) {
        res = await updateProduct(productId, {
          product,
        });
      } else {
        res = await createProduct({
          category_id: product.category_id,
          product,
        } as any);
      }
      if (res) {
        alert(
          isLocalId
            ? "Product submitted successfully!"
            : "Product updated successfully!"
        );
        await clearStoreAndRedirect();
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      alert("Failed to submit the product. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="64px"
      >
        <CircularProgress />
      </Box>
    );
  }

  console.log("product:", product);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-6 p-4"
    >
      {/* Identification & Branding */}
      <section>
        <h2 className="text-xl font-semibold">Identification & Branding</h2>
        <input
          type="text"
          placeholder="SKU"
          value={product.identification_branding?.sku || ""}
          onChange={(e) =>
            handleChange("identification_branding", "sku", e.target.value)
          }
        />
        <input
          type="text"
          placeholder="Name"
          value={product.identification_branding?.name || ""}
          onChange={(e) =>
            handleChange("identification_branding", "name", e.target.value)
          }
        />
        <input
          type="text"
          placeholder="Brand"
          value={product.identification_branding?.brand || ""}
          onChange={(e) =>
            handleChange("identification_branding", "brand", e.target.value)
          }
        />
        <input
          type="text"
          placeholder="Manufacturer"
          value={product.identification_branding?.manufacturer || ""}
          onChange={(e) =>
            handleChange(
              "identification_branding",
              "manufacturer",
              e.target.value
            )
          }
        />
        <input
          type="text"
          placeholder="Model Number"
          value={product.identification_branding?.model_number || ""}
          onChange={(e) =>
            handleChange(
              "identification_branding",
              "model_number",
              e.target.value
            )
          }
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold">Product Specifications</h2>
        <input
          type="number"
          placeholder="Weight"
          value={product.product_specifications?.weight || ""}
          onChange={(e) =>
            handleChange(
              "product_specifications",
              "weight",
              Number(e.target.value)
            )
          }
        />
        <div>
          <h3>Dimensions</h3>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Length"
              value={product.product_specifications?.dimensions?.length || ""}
              onChange={(e) =>
                handleDimensionChange(
                  "product_specifications",
                  "dimensions",
                  "length",
                  Number(e.target.value)
                )
              }
            />
            <input
              type="number"
              placeholder="Width"
              value={product.product_specifications?.dimensions?.width || ""}
              onChange={(e) =>
                handleDimensionChange(
                  "product_specifications",
                  "dimensions",
                  "width",
                  Number(e.target.value)
                )
              }
            />
            <input
              type="number"
              placeholder="Height"
              value={product.product_specifications?.dimensions?.height || ""}
              onChange={(e) =>
                handleDimensionChange(
                  "product_specifications",
                  "dimensions",
                  "height",
                  Number(e.target.value)
                )
              }
            />
            <input
              type="text"
              placeholder="Unit (e.g., cm)"
              value={product.product_specifications?.dimensions?.unit || ""}
              onChange={(e) =>
                handleDimensionChange(
                  "product_specifications",
                  "dimensions",
                  "unit",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Media and Visual</h2>
        <div className="flex flex-col gap-4">
          <div>
            <h3>Main Image</h3>
            <MainImageUploader productId={productId} />
          </div>
          <div>
            <h3>Gallery</h3>
            <GalleryUploader productId={productId} />
          </div>
        </div>
      </section>

      {/* Pricing & Availability */}
      <section>
        <h2 className="text-xl font-semibold">Pricing & Availability</h2>
        <input
          type="number"
          placeholder="Price"
          value={product.pricing_availability?.price || 0}
          onChange={(e) =>
            handleChange(
              "pricing_availability",
              "price",
              Number(e.target.value)
            )
          }
        />
        <input
          type="number"
          placeholder="Quantity"
          value={product.pricing_availability?.quantity || 0}
          onChange={(e) =>
            handleChange(
              "pricing_availability",
              "quantity",
              Number(e.target.value)
            )
          }
        />
      </section>

      {/* Descriptions */}
      <section>
        <h2 className="text-xl font-semibold">Descriptions</h2>
        <textarea
          placeholder="Short Description"
          value={product.descriptions?.short || ""}
          onChange={(e) =>
            handleChange("descriptions", "short", e.target.value)
          }
        />
        <textarea
          placeholder="Long Description"
          value={product.descriptions?.long || ""}
          onChange={(e) => handleChange("descriptions", "long", e.target.value)}
        />
      </section>

      <div className="flex justify-between mt-6 items-center">
        <button
          type="button"
          onClick={clearStoreAndRedirect}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Save Product
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
