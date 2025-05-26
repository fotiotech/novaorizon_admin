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
import { Box, CircularProgress } from "@mui/material";
import MultiValueInput from "@/components/MultipleValuesSelect";
import VariationManager from "@/components/products/VariantManager";
import AttributeField from "@/components/products/AttributeFields";

type AttributeDetail = {
  _id: string;
  name: string;
  option?: string[];
  type: string;
};

type GroupNode = {
  _id: string;
  name: string;
  group_order: number;
  subgroups: GroupNode[];
  attributes: AttributeDetail[];
};

const ProductForm = () => {
  const { files, addFiles } = useFileUploader();
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
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

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

  const currentGroup = groups[stepIndex] || null;

  const handleAttributeChange = (
    groupName: string,
    attrName: string,
    selected: any
  ) => {
    if (groupName === "Variants & Options" && attrName === "Variation Themes") {
      setSelectedThemes(selected);
    }
    dispatch(
      updateAttributes({
        productId,
        groupName,
        attrName,
        selectedValues: selected,
      })
    );
  };

  const handleSubmit = async () => {
    const isLocalId = validate(productId) && version(productId) === 4;
    try {
      let res;
      if (!isLocalId) {
        res = await updateProduct(productId, {
          attributes: product.attributes,
        });
      } else {
        res = await createProduct({
          category_id: product.category_id,
          attributes: product.attributes,
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

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (stepIndex < groups.length - 1) setStepIndex((i) => i + 1);
    else handleSubmit();
  };

  const handlePrev = () => setStepIndex((i) => Math.max(i - 1, 0));

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

  return (
    <form
      onSubmit={handleNext}
      className="flex flex-col gag-2 justify-between min-h-full space-y-6 mb-10 mx-3"
    >
      <div className="flex-1 overflow-y-auto">
        {currentGroup && (
          <div className="group-section">
            <h3 className="text-lg font-semibold mb-3">{currentGroup.name}</h3>

            {/* Render top-level attributes */}
            {currentGroup.attributes.map((detail) => {
              const groupName = currentGroup.name;
              const attrName = detail.name;
              const stored = product.attributes?.[groupName]?.[attrName];
              if (detail.type === "file")
                handleAttributeChange(groupName, attrName, files);

              return (
                <AttributeField
                  key={detail._id}
                  detail={detail}
                  stored={stored}
                  files={files}
                  addFiles={addFiles}
                  brands={brands}
                  selectedBrand={selectedBrand}
                  setSelectedBrand={setSelectedBrand}
                  handleAttributeChange={handleAttributeChange}
                  productId={productId}
                  dispatch={dispatch}
                />
              );
            })}
            {currentGroup.name === "Variants & Options" &&
              selectedThemes.length > 0 && (
                <VariationManager
                  themes={selectedThemes}
                  productId={productId}
                />
              )}
            {/* Render subgroup attributes */}
            {currentGroup.subgroups.map(
              (sub) =>
                sub.attributes.length > 0 && (
                  <div key={sub._id} className="mt-6">
                    <h4 className="text-md font-medium mb-2">{sub.name}</h4>
                    {sub.attributes.map((detail) => {
                      const groupName = sub.name;
                      const attrName = detail.name;
                      const stored =
                        product.attributes?.[groupName]?.[attrName];
                      if (detail.type === "file")
                        handleAttributeChange(groupName, attrName, files);
                      return (
                        <AttributeField
                          key={detail._id}
                          detail={detail}
                          stored={stored}
                          files={files}
                          addFiles={addFiles}
                          brands={brands}
                          selectedBrand={selectedBrand}
                          setSelectedBrand={setSelectedBrand}
                          handleAttributeChange={handleAttributeChange}
                          productId={productId}
                          dispatch={dispatch}
                        />
                      );
                    })}
                  </div>
                )
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={stepIndex === 0}
          className="btn px-6"
        >
          Previous
        </button>
        <div className="flex gap-6">
          <button
            type="button"
            onClick={clearStoreAndRedirect}
            className="border p-2 bg-gray-400 rounded-lg"
          >
            Cancel
          </button>
          <button type="submit" className="btn px-6">
            {stepIndex < groups.length - 1 ? "Next" : "Save & Submit"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
