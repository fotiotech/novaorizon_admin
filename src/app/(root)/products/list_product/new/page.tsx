"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { persistor, RootState } from "@/app/store/store";
import { addProduct, clearProduct } from "@/app/store/slices/productSlice";
import { getBrands } from "@/app/actions/brand";
import { getAttributesByCategoryAndGroupName } from "@/app/actions/category";
import { updateProduct, createProduct } from "@/app/actions/products";
import router from "next/router";
import { v4 as uuidv4, validate, version } from "uuid";
import { Box, CircularProgress } from "@mui/material";
import CollabsibleSection from "@/components/products/CollabsibleSection";
import VariantsManager from "@/components/products/VariantOption";
import ManageRelatedProduct from "@/components/products/ManageRelatedProduct";
import { AttributeField } from "@/components/products/AttributeFields";
import { Brand } from "@/constant/types";
import { redirect } from "next/navigation";

export type AttributeDetail = {
  _id: string;
  code: string;
  name: string;
  option?: string[];
  type: string;
};

export type GroupNode = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  attributes: AttributeDetail[];
  children: GroupNode[];
  group_order: number;
};

const ProductForm = () => {
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];
  const product = productState.byId[productId] || {};

  const [brands, setBrands] = useState<Brand[]>([]);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const clearStoreAndRedirect = async () => {
    await persistor.purge();
    dispatch(clearProduct());
    router.push("/products/list_product");
  };

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        setIsLoading(true);
        if (product.category_id) {
          const resp = await getAttributesByCategoryAndGroupName(product.category_id);
          setGroups(resp as unknown as GroupNode[]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttributes();
  }, [product.category_id]);

  useEffect(() => {
    getBrands().then(setBrands).catch((err) => console.error("Brand fetch error:", err));
  }, []);

  const handleChange = (groupCode: string, field: string, value: any) => {
    dispatch(
      addProduct({
        _id: productId,
        path: `${groupCode}.${field}`,
        value,
      })
    );
  };

  const handleSubmit = async () => {
    const isLocalId = validate(productId) && version(productId) === 4;
    try {
      let res;
      if (!isLocalId) {
        res = await updateProduct(productId, { product });
      } else {
        res = await createProduct({ category_id: product.category_id, product } as any);
      }
      if (res) {
        alert(isLocalId ? "Product submitted successfully!" : "Product updated successfully!");
        await clearStoreAndRedirect();
        redirect("/admin/products/products_list");
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      alert("Failed to submit the product. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="64px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-8 max-w-3xl mx-auto rounded-lg shadow"
    >
      {groups.length > 0 &&
        groups.map((group) => {
          const { code, name, attributes } = group;

          return (
            <section key={group._id} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-300 pb-2">{name}</h2>

              {code === "variants_options" && <VariantsManager productId={productId} />}
              {code === "related_products" && (
                <ManageRelatedProduct product={product} id={productId} />
              )}

              <CollabsibleSection>
                <div className="flex gap-2">
                  {attributes?.map((a) => (
                    <div key={a._id}>
                      <AttributeField
                        productId={productId}
                        attribute={a}
                        field={product?.[code]?.[a.code]}
                        path={code}
                        handleAttributeChange={handleChange}
                      />
                    </div>
                  ))}
                </div>
              </CollabsibleSection>
            </section>
          );
        })}

      <div className="flex justify-between mt-6 items-center">
        <button
          type="button"
          onClick={clearStoreAndRedirect}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
        >
          Save Product
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
