import { addProduct } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";
import React, { ChangeEvent } from "react";
import { useSelector, useDispatch } from "react-redux";


// Define the shape of a Variant entry
interface Variant {
  option: string;
  sku: string;
  price: number;
}

// Define the shape of the variants_options object
interface VariantsOptions {
  variant_theme: string;
  variants: Variant[];
}

// Props for VariantsManager
interface VariantsManagerProps {
  productId: string;
}

const VariantsManager: React.FC<VariantsManagerProps> = ({ productId }) => {
  const dispatch = useDispatch();

  // Safely select the product's variants_options from Redux state, with defaults
  const variantsOptions: VariantsOptions = useSelector((state: RootState) => {
    const raw = state.product.byId[productId]?.variants_options as
      | Partial<VariantsOptions>
      | undefined;
    return {
      variant_theme: raw?.variant_theme ?? "",
      variants: Array.isArray(raw?.variants) ? raw.variants : [],
    };
  });

  // Handle change for variant theme (e.g., "color" or "size")
  const handleThemeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTheme = e.target.value;
    dispatch(
      addProduct({
        _id: productId,
        path: "variants_options.variant_theme",
        value: newTheme,
      })
    );
  };

  // Handle change for individual variant fields using addProduct for nested paths
  const handleVariantFieldChange = (
    index: number,
    field: keyof Variant,
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

  // Add a new empty variant entry
  const handleAddVariant = () => {
    const newVariant: Variant = {
      option: "",
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

  // Remove a variant by index
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

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold border-b pb-2">
        Variants &amp; Options
      </h2>

      {/* Variant Theme Input */}
      <div className="flex flex-col">
        <label className="mb-1 font-medium">
          Variant Theme (e.g., color, size)
        </label>
        <input
          type="text"
          className="border p-2 rounded w-full"
          placeholder="Variant Theme"
          value={variantsOptions.variant_theme}
          onChange={handleThemeChange}
        />
      </div>

      {/* List of Variant Entries */}
      <div className="space-y-4">
        {variantsOptions.variants.map((variant, index) => (
          <div key={index} className="grid grid-cols-4 gap-2 items-end">
            <div className="flex flex-col">
              <label className="mb-1 text-sm">
                Option (e.g., “Red” or “Large”)
              </label>
              <input
                type="text"
                className="border p-2 rounded w-full"
                placeholder="Option"
                value={variant.option}
                onChange={(e) =>
                  handleVariantFieldChange(index, "option", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm">Variant SKU</label>
              <input
                type="text"
                className="border p-2 rounded w-full"
                placeholder="SKU"
                value={variant.sku}
                onChange={(e) =>
                  handleVariantFieldChange(index, "sku", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm">Additional Price</label>
              <input
                type="number"
                className="border p-2 rounded w-full"
                placeholder="Price"
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

        {/* Button to Add New Variant */}
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
