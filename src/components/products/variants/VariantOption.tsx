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
  attributes?: any;
}

const cartesian = (arrays: string[][]): string[][] => {
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  );
};

const VariantsManager: React.FC<VariantsManagerProps> = ({
  productId,
  product,
  attributes,
}) => {
  const dispatch = useDispatch();
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [themeValues, setThemeValues] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<Variant[]>([]);

  const updateProductField = (field: string, value: any) => {
    dispatch(addProduct({ _id: productId, field, value }));
  };

  useEffect(() => {
    if (product?.variant_themes) {
      setSelectedThemes(product.variant_themes);
      setThemeValues(product.variant_values || {});
      setVariants(product.variants || []);
    }
  }, [product]);

  const handleThemeChange = (selected: any) => {
    if (!selected?.length) {
      setSelectedThemes([]);
      setThemeValues({});
      setVariants([]);
      updateProductField("variant_themes", []);
      updateProductField("variant_values", {});
      updateProductField("variants", []);
      return;
    }

    const lastSelected = selected[selected.length - 1].value;
    const themes = lastSelected.split("-").filter(Boolean);

    const newThemeValues = Object.fromEntries(
      themes.map((theme: string) => [theme, themeValues[theme] || []])
    );

    setSelectedThemes(themes);
    setThemeValues(newThemeValues);
    setVariants([]);

    updateProductField("variant_themes", themes);
    updateProductField("variant_values", newThemeValues);
    updateProductField("variants", []);
  };

  const handleThemeValuesChange = (theme: string, valuesString: string) => {
    const values = valuesString
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const updatedThemeValues = { ...themeValues, [theme]: values };

    setThemeValues(updatedThemeValues);
    updateProductField("variant_values", updatedThemeValues);
    generateVariants(updatedThemeValues);
  };

  const generateVariants = (values: Record<string, string[]>) => {
    const valueArrays = selectedThemes.map((theme) => values[theme] || []);

    if (valueArrays.some((arr) => arr.length === 0)) {
      setVariants([]);
      updateProductField("variants", []);
      return;
    }

    const combinations = cartesian(valueArrays);
    const newVariants = combinations.map((combo) => {
      const variant: Variant = { sku: "", price: 0 };
      selectedThemes.forEach((theme, i) => {
        variant[theme] = combo[i];
      });
      return variant;
    });

    setVariants(newVariants);
    updateProductField("variants", newVariants);
  };

  const handleVariantChange = (
    index: number,
    field: string,
    value: string | number | string[]
  ) => {
    const updatedVariants = variants.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant
    );

    setVariants(updatedVariants);
    updateProductField("variants", updatedVariants);
  };

  const renderAttributeContent = (attribute: any) => {
    const { code, name, option } = attribute;

    switch (code) {
      case "variation_themes":
        return (
          <div>
            <Select
              isMulti
              options={option.map((opt: any) => ({
                value: opt,
                label: opt
                  .split("-")
                  .map(
                    (word: any) => word.charAt(0).toUpperCase() + word.slice(1)
                  )
                  .join(" "),
              }))}
              value={option
                .filter((opt: any) => selectedThemes.join("-") === opt)
                .map((opt: any) => ({
                  value: opt,
                  label: opt
                    .split("-")
                    .map(
                      (word: any) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(" "),
                }))}
              onChange={handleThemeChange}
              className="basic-multi-select"
              classNamePrefix="select"
            />

            {selectedThemes.map((theme) => (
              <div key={theme} className="flex flex-col mt-2">
                <label className="mb-1 font-medium capitalize">
                  {theme} Options
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
        );

      case "variants":
        return (
          <div>
            {variants.length > 0 && (
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {selectedThemes.map((theme) => (
                        <th
                          key={theme}
                          className="border p-2 text-left capitalize"
                        >
                          {theme}
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
                            value={variant.sku as string}
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
                            value={variant.price as number}
                            onChange={(e) =>
                              handleVariantChange(
                                index,
                                "price",
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="border p-2">
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full whitespace-nowrap overflow-auto">
      {attributes.map((attribute: any) => (
        <div key={attribute.code}>
          <h4 className="text-md font-semibold mb-3">{attribute.name}</h4>
          {renderAttributeContent(attribute)}
        </div>
      ))}
    </div>
  );
};

export default VariantsManager;
