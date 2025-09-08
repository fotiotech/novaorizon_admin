"use client";

import { addProduct } from "@/app/store/slices/productSlice";
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import VariantImageUploader from "../VariantImageUpload";
import Select from "react-select";

interface Variant {
  [key: string]: string | number | string[];
  sku: string;
  price: number;
}

interface VariantsManagerProps {
  productId: string;
  product?: any;
  attribute?: any;
}

const cartesian = (arrays: string[][]): string[][] => {
  if (!arrays.length) return [];
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  );
};

const VariantsManager: React.FC<VariantsManagerProps> = ({
  productId,
  product,
  attribute,
}) => {
  const dispatch = useDispatch();
  const options: string[] = attribute?.option || [];
  const code = attribute?.code;

  // State for selected variation themes
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  // State for values of each theme
  const [themeValues, setThemeValues] = useState<Record<string, string[]>>({});
  // State for generated variants
  const [variants, setVariants] = useState<Variant[]>([]);

  // Initialize from product data if available
  useEffect(() => {
    if (product?.variant_theme) {
      setSelectedThemes(product.variant_theme);

      // Initialize theme values from product data if available
      if (product.variant_values) {
        setThemeValues(product.variant_values);
      }

      // If we have existing variants, set them
      if (product.variants && product.variants.length > 0) {
        setVariants(product.variants);
      }
    }
  }, [product]);

  // Prepare options for react-select
  const selectOptions = options.map((option) => ({
    value: option,
    label: option
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  }));

  // Get currently selected values for react-select - FIXED
  const selectedOptions = selectOptions.filter(
    (option) =>
      selectedThemes.length > 0 && option.value === selectedThemes.join("-")
  );

  // Handle theme selection change
  const handleThemeChange = (selected: any) => {
    if (!selected || selected.length === 0) {
      // Clear everything if no selection
      setSelectedThemes([]);
      setThemeValues({});
      setVariants([]);

      dispatch(
        addProduct({
          _id: productId,
          field: "variant_theme",
          value: [],
        })
      );

      dispatch(
        addProduct({
          _id: productId,
          field: "variant_values",
          value: {},
        })
      );

      dispatch(
        addProduct({
          _id: productId,
          field: "variants",
          value: [],
        })
      );
      return;
    }

    // Get the last selected option (for single select behavior)
    const lastSelected = selected[selected.length - 1].value;

    // Extract individual themes from the selected option
    const themes = lastSelected
      .split("-")
      .map((s: string) => s.trim())
      .filter(Boolean);

    setSelectedThemes(themes);

    // Initialize empty values for new themes
    const newThemeValues = { ...themeValues };
    themes.forEach((theme: string) => {
      if (!newThemeValues[theme]) {
        newThemeValues[theme] = [];
      }
    });

    // Remove values for themes that are no longer selected
    Object.keys(newThemeValues).forEach((theme) => {
      if (!themes.includes(theme)) {
        delete newThemeValues[theme];
      }
    });

    setThemeValues(newThemeValues);
    setVariants([]);

    // Update the store
    dispatch(
      addProduct({
        _id: productId,
        field: "variant_theme",
        value: themes,
      })
    );

    dispatch(
      addProduct({
        _id: productId,
        field: "variant_values",
        value: newThemeValues,
      })
    );

    dispatch(
      addProduct({
        _id: productId,
        field: "variants",
        value: [],
      })
    );
  };

  // Handle changes to theme values
  const handleThemeValuesChange = (theme: string, valuesString: string) => {
    const values = valuesString
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const updatedThemeValues = { ...themeValues, [theme]: values };
    setThemeValues(updatedThemeValues);

    // Update the store
    dispatch(
      addProduct({
        _id: productId,
        field: "variant_values",
        value: updatedThemeValues,
      })
    );

    // Generate variants if all themes have values
    generateVariants(updatedThemeValues);
  };

  // Generate variants based on theme values
  const generateVariants = (values: Record<string, string[]>) => {
    const valueArrays = selectedThemes.map((theme) => values[theme] || []);

    // Check if all themes have values
    if (valueArrays.some((arr) => arr.length === 0)) {
      setVariants([]);
      dispatch(
        addProduct({
          _id: productId,
          field: "variants",
          value: [],
        })
      );
      return;
    }

    // Generate all combinations
    const combinations = cartesian(valueArrays);
    const newVariants: Variant[] = combinations.map((combo) => {
      const variant: Variant = { sku: "", price: 0 };
      selectedThemes.forEach((theme, i) => {
        variant[theme] = combo[i];
      });
      return variant;
    });

    setVariants(newVariants);
    dispatch(
      addProduct({
        _id: productId,
        field: "variants",
        value: newVariants,
      })
    );
  };

  // Handle changes to individual variant fields
  const handleVariantChange = (
    index: number,
    field: string,
    value: string | number | string[]
  ) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };

    setVariants(updatedVariants);
    dispatch(
      addProduct({
        _id: productId,
        field: "variants",
        value: updatedVariants,
      })
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {code === "variation_themes" && (
        <div className="">
          <label className="block mb-2 font-medium">Variation Themes</label>
          <Select
            isMulti
            options={selectOptions}
            value={selectedOptions}
            onChange={handleThemeChange}
            className="basic-multi-select"
            classNamePrefix="select"
          />
        </div>
      )}

      {selectedThemes.length > 0 && (
        <div className="space-y-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selectedThemes.map((theme) => (
              <div key={theme} className="flex flex-col">
                <label className="mb-1 font-medium">
                  {theme.charAt(0).toUpperCase() + theme.slice(1)} Options
                </label>
                <input
                  type="text"
                  className="border p-2 rounded"
                  placeholder="Enter values separated by commas"
                  value={themeValues[theme]?.join(", ") || ""}
                  onChange={(e) =>
                    handleThemeValuesChange(theme, e.target.value)
                  }
                />
              </div>
            ))}
          </div>

          {variants.length > 0 && (
            <div className="overflow-x-auto">
              <h4 className="text-md font-semibold mb-3">Generated Variants</h4>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {selectedThemes.map((theme) => (
                      <th key={theme} className="border p-2 text-left">
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </th>
                    ))}
                    <th className="border p-2 text-left">SKU</th>
                    <th className="border p-2 text-left">Price</th>
                    <th className="border p-2 text-left">Image</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={index}>
                      {selectedThemes.map((theme) => (
                        <td key={theme} className="border p-2">
                          {variant[theme] as string}
                        </td>
                      ))}
                      <td className="border p-2">
                        <input
                          title="sku"
                          type="text"
                          className="w-full p-1 border rounded"
                          value={variant.sku}
                          onChange={(e) =>
                            handleVariantChange(index, "sku", e.target.value)
                          }
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          title="price"
                          type="number"
                          className="w-full p-1 border rounded"
                          value={variant.price}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "price",
                              Number(e.target.value)
                            )
                          }
                        />
                      </td>
                      <td className="border p-2 ">
                        <div className="w-full h-20 overflow-auto">
                          <VariantImageUploader
                            index={index}
                            handleVariantChange={handleVariantChange}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VariantsManager;
