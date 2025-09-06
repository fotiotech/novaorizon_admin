"use client";

import { addProduct } from "@/app/store/slices/productSlice";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import VariantImageUploader from "./VariantImageUpload";
import Select, { MultiValue } from "react-select";

interface Variant {
  [key: string]: string | number;
  sku: string;
  price: number;
}

interface VariantsManagerProps {
  productId: string;
  product?: any;
  attribute?: any; // expects attribute.option = string[] and attribute.code = 'variants' or 'variation_themes'
}

const cartesian = (arrays: string[][]): string[][] => {
  if (!arrays.length) return [];
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  );
};

const uniqueOrdered = (arr: string[]) =>
  arr.filter((v, i) => arr.indexOf(v) === i);

const VariantsManager: React.FC<VariantsManagerProps> = ({
  productId,
  product,
  attribute,
}) => {
  const dispatch = useDispatch();
  const options: string[] = attribute?.option || [];
  const code = attribute?.code;

  // Selected raw option values from the Select (e.g. ['color-size', 'color'])
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  // Derived individual themes (e.g. ['color','size'])
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  // Map theme -> values array (e.g. { color: ['red','blue'], size: ['S','M'] })
  const [themeValues, setThemeValues] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    if (product?.variant_theme) {
      setSelectedThemes(product.variant_theme);
      // Would need logic to set selectedOptions and themeValues too
    }
  }, [product]);

  // When user changes the options (select), split combined options like 'color-size' into ['color','size']
  const handleThemeChange = (
    opts: MultiValue<{ value: string; label: string }>
  ) => {
    const optValues = opts.map((o) => o.value);
    setSelectedOptions(optValues);

    // flatten combined option strings and dedupe while preserving order
    const flattened = uniqueOrdered(
      optValues.flatMap((v) =>
        v
          .split("-")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    setSelectedThemes(flattened);

    // keep existing theme values if present, but ensure keys exist for new themes
    setThemeValues((prev) => {
      const next: Record<string, string[]> = {};
      flattened.forEach((t) => {
        next[t] = prev[t] || [];
      });
      return next;
    });

    // reset variants until user fills values
    setVariants([]);

    // persist the selected themes to store (only variant_theme)
    dispatch(
      addProduct({
        _id: productId,
        field: "variant_theme",
        value: flattened,
      })
    );

    // clear variants in the store while values are not filled
    dispatch(
      addProduct({
        _id: productId,
        field: "variants",
        value: [],
      })
    );
  };

  // Called when user types comma-separated values for a theme
  const handleThemeValuesChange = (theme: string, csv: string) => {
    const vals = csv
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const nextThemeValues = { ...themeValues, [theme]: vals };
    setThemeValues(nextThemeValues);

    // If any selected theme has no values yet, don't generate variants
    const arraysInOrder = selectedThemes.map((t) => nextThemeValues[t] || []);
    if (
      arraysInOrder.length === 0 ||
      arraysInOrder.some((a) => a.length === 0)
    ) {
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

    // Generate cartesian product and build variants
    const combos = cartesian(arraysInOrder);
    const newVariants: Variant[] = combos.map((combo) => {
      const v: Variant = { sku: "", price: 0 };
      selectedThemes.forEach((t, i) => {
        v[t] = combo[i];
      });
      return v;
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

  const handleVariantChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = variants.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    );
    setVariants(updated);
    dispatch(
      addProduct({
        _id: productId,
        field: "variants",
        value: updated,
      })
    );
  };

  const handleRemoveVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    dispatch(
      addProduct({
        _id: productId,
        field: "variants",
        value: updated,
      })
    );
  };

  const handleSaveVariants = () => {
    dispatch(
      addProduct({
        _id: productId,
        field: "variants",
        value: variants,
      })
    );
  };

  console.log({ selectedOptions, selectedThemes, themeValues, variants });

  // Helper: react-select value format
  const selectValue = options
    .filter((o) => selectedOptions.includes(o))
    .map((v) => ({ value: v, label: v }));

  return (
    <section className="space-y-4">
      {code === "variation_themes" && (
        <Select
          isMulti
          options={options.map((v) => ({ value: v, label: v }))}
          value={selectValue}
          onChange={(o) => handleThemeChange(o)}
          styles={{
            control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
            menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
          }}
        />
      )}

      {code === "variants" && selectedThemes.length > 0 && (
        <div className="space-y-4">
          {/* Inputs to enter values for each individual theme */}
          <div className="grid gap-3 md:grid-cols-2">
            {selectedThemes.map((t) => (
              <div key={t} className="flex flex-col">
                <label className="mb-1 text-sm">
                  {t.charAt(0).toUpperCase() + t.slice(1)} values
                  (comma-separated)
                </label>
                <input
                  type="text"
                  className="border p-2 rounded w-full"
                  placeholder={`e.g. red, blue, green`}
                  value={(themeValues[t] || []).join(", ")}
                  onChange={(e) => handleThemeValuesChange(t, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Variants list - dynamic columns based on number of themes */}
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div
                key={index}
                className="gap-2 items-end"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${selectedThemes.length}, minmax(0, 1fr)) 140px 100px 80px`,
                  gap: "8px",
                }}
              >
                {selectedThemes.map((t) => (
                  <div key={t} className="flex flex-col">
                    <label className="mb-1 text-sm">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </label>
                    <input
                      title="text"
                      type="text"
                      className="border p-2 rounded w-full bg-gray-100"
                      value={(variant[t] as string) || ""}
                      disabled
                    />
                  </div>
                ))}

                <div className="flex flex-col">
                  <label className="mb-1 text-sm">SKU</label>
                  <input
                    title="sku"
                    type="text"
                    className="border p-2 rounded w-full"
                    value={variant.sku}
                    onChange={(e) =>
                      handleVariantChange(index, "sku", e.target.value)
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
                      handleVariantChange(
                        index,
                        "price",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="flex items-center">
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
          </div>

          <div className="flex gap-3 items-center mt-4">
            <button
              type="button"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleSaveVariants}
            >
              Save Variants
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default VariantsManager;
