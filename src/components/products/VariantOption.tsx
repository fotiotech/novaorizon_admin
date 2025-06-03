"use client";

import { addProduct } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";
import React, { ChangeEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import VariantImageUploader from "./VariantImageUpload";

interface Variant {
  [key: string]: string | number;
  sku: string;
  price: number;
}

interface VariantsOptions {
  variant_theme: string;
  variants: Variant[];
}

interface VariantsManagerProps {
  productId: string;
}

const VariantsManager: React.FC<VariantsManagerProps> = ({ productId }) => {
  const dispatch = useDispatch();

  const variantsOptions: VariantsOptions = useSelector((state: RootState) => {
    const raw = state.product.byId[productId]?.variants_options as
      | Partial<VariantsOptions>
      | undefined;
    return {
      variant_theme: raw?.variant_theme ?? "",
      variants: Array.isArray(raw?.variants) ? raw.variants : [],
    };
  });

  const handleThemeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTheme = e.target.value.trim();

    // Migrate existing variants to use new theme key
    const updatedVariants = variantsOptions.variants.map((variant) => {
      const oldKey = variantsOptions.variant_theme;
      const value = oldKey && variant[oldKey] ? variant[oldKey] : "";
      const { [oldKey]: _, ...rest } = variant;
      return {
        ...rest,
        [newTheme]: value,
      };
    });

    dispatch(
      addProduct({
        _id: productId,
        path: "variants_options.variant_theme",
        value: newTheme,
      })
    );

    dispatch(
      addProduct({
        _id: productId,
        path: "variants_options.variants",
        value: updatedVariants,
      })
    );
  };

  const handleVariantFieldChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const path = `variants_options.variants.${index}.${field}`;
    dispatch(
      addProduct({
        _id: productId,
        path,
        value,
      })
    );
  };

  const handleAddVariant = () => {
    const theme = variantsOptions.variant_theme || "option";
    const newVariant: Variant = {
      [theme]: "",
      sku: "",
      price: 0,
    };
    const updatedVariants = [...variantsOptions.variants, newVariant];
    dispatch(
      addProduct({
        _id: productId,
        path: "variants_options.variants",
        value: updatedVariants,
      })
    );
  };

  const handleRemoveVariant = (index: number) => {
    const updatedVariants = variantsOptions.variants.filter(
      (_, idx) => idx !== index
    );
    dispatch(
      addProduct({
        _id: productId,
        path: "variants_options.variants",
        value: updatedVariants,
      })
    );
  };

  const theme = variantsOptions.variant_theme;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold border-b pb-2">
        Variants &amp; Options
      </h2>

      <div className="flex flex-col">
        <label className="mb-1 font-medium">
          Variant Theme (e.g., color, size)
        </label>
        <input
          type="text"
          className="border p-2 rounded w-full"
          placeholder="Variant Theme"
          value={theme}
          onChange={handleThemeChange}
        />
      </div>

      <div className="space-y-4">
        {variantsOptions.variants.map((variant, index) => (
          <div key={index} className="grid grid-cols-4 gap-2 items-end">
            <div className="flex flex-col">
              <label className="mb-1 text-sm">
                {theme
                  ? theme.charAt(0).toUpperCase() + theme.slice(1)
                  : "Option"}
              </label>
              <input
                type="text"
                className="border p-2 rounded w-full"
                placeholder={`Enter ${theme}`}
                value={(variant[theme] as string) || ""}
                onChange={(e) =>
                  handleVariantFieldChange(index, theme, e.target.value)
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm">SKU</label>
              <input
                title="sku"
                type="text"
                className="border p-2 rounded w-full"
                value={variant.sku}
                onChange={(e) =>
                  handleVariantFieldChange(index, "sku", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm">Price</label>
              <input
                title="price"
                type="number"
                className="border p-2 rounded w-full"
                value={variant.price}
                onChange={(e) =>
                  handleVariantFieldChange(
                    index,
                    "price",
                    Number(e.target.value)
                  )
                }
              />
            </div>

            <div>
              <VariantImageUploader productId={productId} index={index} />
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className="text-red-500 text-sm"
                onClick={() => handleRemoveVariant(index)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div>
          <button
            type="button"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleAddVariant}
          >
            Add Variant
          </button>
        </div>
      </div>
    </section>
  );
};

export default VariantsManager;
