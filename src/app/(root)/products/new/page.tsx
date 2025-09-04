"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { persistor, RootState } from "@/app/store/store";
import {
  addProduct,
  clearProduct,
  setProducts,
} from "@/app/store/slices/productSlice";
import { getBrands } from "@/app/actions/brand";
import { find_category_attribute_groups } from "@/app/actions/category";
import {
  updateProduct,
  createProduct,
  findProducts,
} from "@/app/actions/products";
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
      const isLocalId = validate(productId) && version(productId) === 4;
      try {
        setIsLoading(true);
        if (!isLocalId) {
          const res = productId ? await findProducts(productId) : null;
          if (res) {
            if ("rootGroup" in res && Array.isArray(res.rootGroup)) {
              setGroups(res.rootGroup as unknown as GroupNode[]);
              res.rootGroup.forEach((group: any) => {
                group.attributes?.forEach((attr: any) => {
                  if (attr && typeof attr === "object") {
                    Object.entries(attr).forEach(([k, v]) => {
                      if (k !== null && v !== undefined && v !== null) {
                        dispatch(
                          addProduct({
                            _id: productId,
                            field: k,
                            value: v || "",
                          })
                        );
                      }
                    });
                  }
                });
              });
            } else {
              setGroups([]);
            }
          }
        } else if (product.category_id) {
          const resp = await find_category_attribute_groups(
            product.category_id
          );
          console.log({ resp });

          setGroups(resp as unknown as GroupNode[]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttributes();
  }, [product.category_id, productId]);

  useEffect(() => {
    getBrands()
      .then(setBrands)
      .catch((err) => console.error("Brand fetch error:", err));
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
      let res;
      if (!isLocalId) {
        res = await updateProduct(productId, { attributes: product });
      } else {
        res = await createProduct({
          category_id: product.category_id,
          attributes: product,
        } as any);
      }
      if (res.ok) {
        alert(
          isLocalId
            ? "Product submitted successfully!"
            : "Product updated successfully!"
        );
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

  console.log({ groups });
  console.log({ product });

  function renderGroup(group: any) {
    const { _id, code, name, attributes, children } = group;

    return (
      <section key={_id} className="space-y-4">
        {/* special managers (now actually rendered) */}
        {/* {code === "variants_options" && (
          <VariantsManager productId={productId} />
        )}
        {code === "related_products" && (
          <ManageRelatedProduct product={product} id={productId} name={name} />
        )} */}

        <CollabsibleSection name={name}>
          <div className="flex flex-col gap-2">
            {attributes?.map((a: any) => {
              // attribute field under the group object (may be primitive or nested obj)

              return (
                <div key={a?._id}>
                  <AttributeField
                    productId={productId}
                    attribute={a}
                    field={product[a?.code]}
                    handleAttributeChange={handleChange}
                  />
                </div>
              );
            })}

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
      className="space-y-8 max-w-3xl mx-auto rounded-lg shadow"
    >
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
