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
import Spinner from "@/components/Spinner";
import { Box, CircularProgress } from "@mui/material";
import MultiValueInput from "@/components/MultipleValuesSelect";
import VariationManager from "@/components/products/VariantManager";

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
    <form onSubmit={handleNext} className="space-y-6 mb-10">
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
          {currentGroup.name === 'Variants & Options' && (
            selectedThemes.length > 0 && <VariationManager themes={selectedThemes} productId={productId} />
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
                </div>
              )
          )}
          
        </div>
      )}
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

// Extracted for reuse
const AttributeField: React.FC<{
  detail: any;
  stored: any;
  files: any[];
  addFiles: (f: any[]) => void;
  brands: Brand[];
  selectedBrand: { value: string; label: string } | null;
  setSelectedBrand: React.Dispatch<
    React.SetStateAction<{ value: string; label: string } | null>
  >;
  handleAttributeChange: (
    groupName: string,
    attrName: string,
    selected: any
  ) => void;
  productId: string;
  dispatch: any;
}> = ({
  detail,
  stored,
  files,
  addFiles,
  brands,
  selectedBrand,
  setSelectedBrand,
  handleAttributeChange,
  productId,
  dispatch,
}) => {
  const { name, _id, type, option } = detail;
  const groupName = detail.groupId?.name ?? "";

  // Options for code type when name is 'Product Code'
  const codeTypeOptions = [
    { value: "SKU", label: "SKU" },
    { value: "UPC", label: "UPC" },
    { value: "ISBN", label: "ISBN" },
  ];

  return (
    <div key={_id} className="mb-4">
      <label className="block mb-1">{name}</label>

      {/* File type */}
      {type === "file" && (
        <FilesUploader files={stored || []} addFiles={addFiles} />
      )}

      {/* Product Code composite field */}
      {type === "text" && name === "Product Code" ? (
        <div className="flex gap-4 items-center">
          <Select
            options={codeTypeOptions}
            value={codeTypeOptions.find(
              (opt) => opt.value === (stored?.type || "")
            )}
            onChange={(opt) =>
              handleAttributeChange(groupName, name, {
                ...stored,
                type: opt?.value,
                value: stored?.value,
              })
            }
            styles={{
              control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
              menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
            }}
          />
          <input
            title="Product Code"
            type="text"
            className="flex-1"
            placeholder="Enter code"
            value={stored?.value || ""}
            onChange={(e) =>
              handleAttributeChange(groupName, name, {
                ...stored,
                type: stored?.type,
                value: e.target.value,
              })
            }
          />
        </div>
      ) : null}

      {/* Regular text field */}
      {type === "text" && name !== "Product Code" && (
        <input
          title={type}
          type="text"
          className="w-full"
          value={stored || ""}
          onChange={(e) =>
            handleAttributeChange(groupName, name, e.target.value)
          }
        />
      )}

      {/* Textarea */}
      {type === "textarea" && (
        <textarea
          title={type}
          className="w-full bg-transparent"
          value={stored || ""}
          onChange={(e) =>
            handleAttributeChange(groupName, name, e.target.value)
          }
        />
      )}

      {/* Number */}
      {type === "number" && (
        <input
          title={type}
          type="number"
          className="w-full"
          value={stored || 0}
          onChange={(e) =>
            handleAttributeChange(groupName, name, Number(e.target.value))
          }
        />
      )}

      {/* Select multi */}
      {type === "select" && option && (
        <Select
          isMulti
          options={option.map((v: any) => ({ value: v, label: v }))}
          value={
            Array.isArray(stored)
              ? option
                  .filter((v: any) => stored.includes(v))
                  .map((v: any) => ({ value: v, label: v }))
              : []
          }
          onChange={(opts: MultiValue<{ value: string; label: string }>) =>
            handleAttributeChange(
              groupName,
              name,
              opts.map((o) => o.value)
            )
          }
          styles={{
            control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
            menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
          }}
        />
      )}

      {/* Brand select */}
      {type === "select" && name === "Brand" && (
        <Select
          value={selectedBrand}
          options={brands.map((b) => ({ value: b._id, label: b.name }))}
          onChange={(opt) => {
            setSelectedBrand(opt);
            handleAttributeChange(detail.groupId?.name ?? "", name, opt?.value);
          }}
          styles={{
            control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
            menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
          }}
        />
      )}
    </div>
  );
};

export default ProductForm;
