"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { persistor, RootState } from "@/app/store/store";
import { addProduct, clearProduct } from "@/app/store/slices/productSlice";
import { getBrands } from "@/app/actions/brand";
import { find_category_attribute_groups } from "@/app/actions/category";
import {
  updateProduct,
  createProduct,
  findProducts,
} from "@/app/actions/products";
import router from "next/router";
import { v4 as uuidv4, validate, version } from "uuid";
import { Box, CircularProgress, Alert } from "@mui/material";
import CollabsibleSection from "@/components/products/CollabsibleSection";
import { AttributeField } from "@/components/products/AttributeFields";
import { Brand } from "@/constant/types";
import { redirect } from "next/navigation";
import ManageRelatedProduct from "../../../../components/products/ManageRelatedProduct";

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearStoreAndRedirect = async () => {
    await persistor.purge();
    dispatch(clearProduct());
    router.push("/products/list_product");
  };

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const resp = await find_category_attribute_groups(product.category_id);
        console.log("Fetched attribute groups:", resp);
        setGroups(resp as unknown as GroupNode[]);
      } catch (err) {
        console.error("Error fetching attributes:", err);
        setError("Failed to load product attributes. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttributes();
  }, [product.category_id, productId, dispatch]);

  useEffect(() => {
    getBrands()
      .then(setBrands)
      .catch((err) => {
        console.error("Brand fetch error:", err);
        setError("Failed to fetch brands. Please refresh.");
      });
  }, []);

  const handleChange = (field: string, value: any) => {
    dispatch(
      addProduct({
        _id: productId,
        field,
        value,
      })
    );
  };

  const handleSubmit = async () => {
    const isLocalId = validate(productId) && version(productId) === 4;
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      let res;
      if (!isLocalId) {
        res = await updateProduct(productId, { attributes: product });
      } else {
        res = await createProduct({
          category_id: product.category_id,
          ...product,
        } as any);
      }

      if (res.success) {
        setSuccess(
          isLocalId
            ? "Product submitted successfully!"
            : "Product updated successfully!"
        );
        await clearStoreAndRedirect();
        redirect("/admin/products/products_list");
      } else {
        setError(res.error || "Failed to submit product.");
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
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

  console.log("Rendering groups:", product);

  function renderGroup(group: any) {
    const { _id, code, name, attributes, children } = group;

    return (
      <section key={_id} className="space-y-4">
        <CollabsibleSection name={name}>
          <div className="flex flex-col gap-2">
            {attributes?.map((a: any) => (
              <div key={a?._id}>
                <AttributeField
                  productId={productId}
                  attribute={a}
                  field={product[a?.code]}
                  handleAttributeChange={handleChange}
                />
              </div>
            ))}

            {children?.length > 0 &&
              children.map((child: any) => renderGroup(child))}
          </div>
        </CollabsibleSection>
      </section>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-8 max-w-3xl mx-auto rounded-lg shadow p-4"
    >
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      {groups.length > 0 && groups.map((group) => renderGroup(group))}

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
