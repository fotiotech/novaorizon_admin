"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useDispatch } from "react-redux";
import { addProduct } from "@/app/store/slices/productSlice";
import VariantImageUploader from "../VariantImageUpload";
import Select from "react-select";

interface Attribute {
  id: string;
  code: string;
  name: string;
  options?: string[];
  type: string;
}

interface Variant {
  [key: string]: string | number | string[] | null;
  sku: string;
  price: number;
}

interface VariantsManagerProps {
  productId: string;
  product?: any;
  attributes?: Attribute[];
  variantFields?: Attribute[];
}

const cartesian = (arrays: string[][]): string[][] =>
  arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );

const VariantsManager: React.FC<VariantsManagerProps> = ({
  productId,
  product,
  attributes = [],
  variantFields = [],
}) => {
  const dispatch = useDispatch();
  const [selectedThemeCodes, setSelectedThemeCodes] = useState<string[]>([]);
  const [themeValues, setThemeValues] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<Variant[]>([]);

  const isInitializing = useRef(true);
  const initialized = useRef(false); // ✅ NEW: prevents re‑init on product changes

  const updateProductField = useCallback(
    (field: string, value: any) => {
      dispatch(addProduct({ _id: productId, field, value }));
    },
    [dispatch, productId],
  );

  // ----- 1. INITIALIZATION (runs only once) -----
  useEffect(() => {
    // Skip if already initialised or product is not yet available
    if (initialized.current || !product) return;

    const savedThemes = product.variant_themes || [];
    const validThemes = savedThemes.filter((code: string) =>
      attributes.some((a) => a.code === code),
    );
    setSelectedThemeCodes(validThemes);

    const savedValues = product.variant_values || {};
    const initialValues: Record<string, string[]> = {};
    attributes.forEach((attr) => {
      initialValues[attr.code] = savedValues[attr.code] || [];
    });
    setThemeValues(initialValues);

    setVariants(product.variants || []);

    initialized.current = true;
    isInitializing.current = false;
  }, [product, attributes]); // ✅ product is included, but ref prevents re‑run

  // ----- 2. GENERATE VARIANTS -----
  const fieldKey = useMemo(
    () => variantFields.map((f) => f.code).join(","),
    [variantFields],
  );

  useEffect(() => {
    if (isInitializing.current) return;

    const themeCodes = selectedThemeCodes;
    const valueArrays = themeCodes.map((code) => themeValues[code] || []);

    if (
      themeCodes.length === 0 ||
      valueArrays.some((arr) => arr.length === 0)
    ) {
      setVariants([]);
      updateProductField("variants", []);
      return;
    }

    const combinations = cartesian(valueArrays);
    const newVariants = combinations.map((combo) => {
      const variant: any = { sku: "", price: 0 };
      themeCodes.forEach((code, i) => {
        variant[code] = combo[i];
      });
      variantFields.forEach((field) => {
        if (field.type === "number") variant[field.code] = 0;
        else if (field.type === "file") variant[field.code] = [];
        else variant[field.code] = "";
      });
      return variant;
    });

    setVariants(newVariants);
    updateProductField("variants", newVariants);
  }, [selectedThemeCodes, themeValues, fieldKey, updateProductField]);

  // ----- 3. HANDLERS (MEMOIZED) -----
  const handleThemeSelect = useCallback(
    (selectedOptions: any) => {
      const selectedCodes = selectedOptions
        ? selectedOptions.map((opt: any) => opt.value)
        : [];
      setSelectedThemeCodes(selectedCodes);
      updateProductField("variant_themes", selectedCodes);
    },
    [updateProductField],
  );

  const handleThemeValuesChange = useCallback(
    (themeCode: string, valuesString: string) => {
      const values = valuesString
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      setThemeValues((prev) => {
        const newThemeValues = { ...prev, [themeCode]: values };
        updateProductField("variant_values", newThemeValues);
        return newThemeValues;
      });
    },
    [updateProductField],
  );

  // ✅ Stable handler for variant changes – functional update, no deps
  const handleVariantChange = useCallback(
    (index: number, field: string, value: any) => {
      setVariants((prevVariants) => {
        const updated = prevVariants.map((variant, i) =>
          i === index ? { ...variant, [field]: value } : variant,
        );
        return updated;
      });
    },
    [],
  );

  // ✅ Sync variants to Redux when they change (after initial load)
  useEffect(() => {
    if (!isInitializing.current) {
      updateProductField("variants", variants);
    }
  }, [variants, updateProductField]);

  // ----- 4. RENDER -----
  const renderFieldInput = useCallback(
    (field: Attribute, variant: Variant, index: number) => {
      const value = variant[field.code] ?? "";
      const commonProps = {
        className: "w-full p-1 border rounded",
        value,
      };

      switch (field.type) {
        case "number":
          return (
            <input
              type="number"
              {...commonProps}
              onChange={(e) =>
                handleVariantChange(index, field.code, Number(e.target.value))
              }
            />
          );
        case "select":
          return (
            <select
              {...commonProps}
              onChange={(e) =>
                handleVariantChange(index, field.code, e.target.value)
              }
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          );
        case "file":
          return (
            <VariantImageUploader
              index={index}
              fieldCode={field.code}
              productId={productId}
              initialFiles={(variant[field.code] as string[]) || []}
              handleVariantChange={handleVariantChange}
            />
          );
        default:
          return (
            <input
              type="text"
              {...commonProps}
              onChange={(e) =>
                handleVariantChange(index, field.code, e.target.value)
              }
            />
          );
      }
    },
    [handleVariantChange],
  );

  const themeOptions = attributes.map((attr) => ({
    value: attr.code,
    label: attr.name || attr.code,
  }));

  const selectedOptions = themeOptions.filter((opt) =>
    selectedThemeCodes.includes(opt.value),
  );

  if (attributes.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No variant themes defined for this group.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full overflow-auto">
      {/* Theme selection */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Select themes to use for variants
        </label>
        <Select
          isMulti
          options={themeOptions}
          value={selectedOptions}
          onChange={handleThemeSelect}
          placeholder="Choose themes..."
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </div>

      {/* Theme values inputs */}
      {selectedThemeCodes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedThemeCodes.map((code) => {
            const attr = attributes.find((a) => a.code === code);
            if (!attr) return null;
            return (
              <div key={code}>
                <label className="block text-sm font-medium capitalize mb-1">
                  {attr.name || code} values
                </label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  placeholder={`Enter ${attr.name || code} values, comma‑separated`}
                  value={themeValues[code]?.join(", ") || ""}
                  onChange={(e) =>
                    handleThemeValuesChange(code, e.target.value)
                  }
                />
                {attr.options && attr.options.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Suggested: {attr.options.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Variant table */}
      {variants.length > 0 && (
        <>
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {selectedThemeCodes.map((code) => (
                    <th key={code} className="border p-2 text-left capitalize">
                      {attributes.find((a) => a.code === code)?.name || code}
                    </th>
                  ))}
                  {variantFields.map((field) => (
                    <th
                      key={field.code}
                      className="border p-2 text-left capitalize"
                    >
                      {field.name || field.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr key={index}>
                    {selectedThemeCodes.map((code) => (
                      <td key={code} className="border p-2">
                        {variant[code] as string}
                      </td>
                    ))}
                    {variantFields.map((field) => (
                      <td key={field.code} className="border p-2">
                        {renderFieldInput(field, variant, index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Variant summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-sm font-medium text-gray-700">
              Variant Summary
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Total variants:{" "}
              <span className="font-semibold">{variants.length}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {variants.map((v, idx) => {
                const label = selectedThemeCodes
                  .map((code) => v[code] as string)
                  .join(" - ");
                return (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VariantsManager;
