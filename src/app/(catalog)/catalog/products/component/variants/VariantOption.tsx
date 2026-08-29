"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  onUpdate: (field: string, value: any) => void;
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
  onUpdate,
}) => {
  const [selectedThemeCodes, setSelectedThemeCodes] = useState<string[]>([]);
  const [themeValues, setThemeValues] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<Variant[]>([]);

  const isInitializing = useRef(true);
  const initialized = useRef(false);
  const prevProductId = useRef<string | null>(null);
  const isFirstRender = useRef(true);
  // Ref to prevent sync loops
  const isSyncing = useRef(false);
  const previousProduct = useRef<any>(null);

  // ---- Reset when productId changes ----
  useEffect(() => {
    if (prevProductId.current !== productId) {
      prevProductId.current = productId;
      initialized.current = false;
      isInitializing.current = true;
      isFirstRender.current = true;
      setSelectedThemeCodes([]);
      setThemeValues({});
      setVariants([]);
    }
  }, [productId]);

  // ---- Initialize from product data ----
  useEffect(() => {
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

    // Always ensure variants is an array
    const initialVariants = Array.isArray(product.variants)
      ? product.variants
      : [];
    setVariants(initialVariants);

    initialized.current = true;
    isInitializing.current = false;
    isFirstRender.current = false;
    previousProduct.current = product;
  }, [product, attributes]);

  // ---- Sync: main product attribute changes → theme values (first combination) ----
  useEffect(() => {
    if (isInitializing.current || !product || isSyncing.current) return;

    // Check if any of the selected themes have changed in the main product
    let changed = false;
    const newThemeValues = { ...themeValues };
    selectedThemeCodes.forEach((code) => {
      const productValue = product[code];
      const currentValues = themeValues[code] || [];
      if (
        productValue !== undefined &&
        productValue !== null &&
        productValue !== ""
      ) {
        const stringValue = String(productValue);
        if (!currentValues.includes(stringValue)) {
          // Add it to the front so that the first combination uses this value
          newThemeValues[code] = [stringValue, ...currentValues];
          changed = true;
        }
      }
    });
    if (changed) {
      isSyncing.current = true;
      setThemeValues(newThemeValues);
      onUpdate("variant_values", newThemeValues);
      setTimeout(() => {
        isSyncing.current = false;
      }, 0);
    }
  }, [product, selectedThemeCodes, themeValues, onUpdate]);

  // ---- Generate variants when themes or values change ----
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
      if (variants.length > 0) {
        setVariants([]);
      }
      return;
    }

    const combinations = cartesian(valueArrays);
    const existingMap = new Map<string, Variant>();
    variants.forEach((v) => {
      const key = themeCodes.map((code) => v[code] as string).join("|");
      existingMap.set(key, v);
    });

    const newVariants = combinations.map((combo) => {
      const variant: any = {};
      themeCodes.forEach((code, i) => {
        variant[code] = combo[i];
      });
      const key = combo.join("|");
      const existing = existingMap.get(key);
      if (existing) {
        const themeSet = new Set(themeCodes);
        Object.keys(existing).forEach((field) => {
          if (!themeSet.has(field)) {
            variant[field] = existing[field];
          }
        });
      } else {
        variantFields.forEach((field) => {
          if (field.type === "number") variant[field.code] = null;
          else if (field.type === "file") variant[field.code] = [];
          else variant[field.code] = "";
        });
      }
      return variant;
    });

    const hasChanged =
      newVariants.length !== variants.length ||
      newVariants.some(
        (v, i) => JSON.stringify(v) !== JSON.stringify(variants[i]),
      );

    if (hasChanged) {
      setVariants(newVariants);
      onUpdate("variants", newVariants);
    }
  }, [selectedThemeCodes, themeValues, fieldKey, variantFields]);

  // ---- Sync variants to parent on every change (skip initial) ----
  useEffect(() => {
    if (isInitializing.current || isFirstRender.current) return;
    onUpdate("variants", variants);
  }, [variants, onUpdate]);

  // ---- Handlers ----
  const handleThemeSelect = useCallback(
    (selectedOptions: any) => {
      const selectedCodes = selectedOptions
        ? selectedOptions.map((opt: any) => opt.value)
        : [];
      setSelectedThemeCodes(selectedCodes);
      onUpdate("variant_themes", selectedCodes);

      // For each newly selected theme, pre‑fill with the product's current value
      const newThemeValues = { ...themeValues };
      let updated = false;
      selectedCodes.forEach((code: any) => {
        const productValue = product?.[code];
        if (
          productValue !== undefined &&
          productValue !== null &&
          productValue !== ""
        ) {
          const stringValue = String(productValue);
          const existing = newThemeValues[code] || [];
          if (!existing.includes(stringValue)) {
            newThemeValues[code] = [stringValue, ...existing];
            updated = true;
          }
        }
      });
      if (updated) {
        setThemeValues(newThemeValues);
        onUpdate("variant_values", newThemeValues);
      }
    },
    [onUpdate, themeValues, product],
  );

  const handleThemeValuesChange = useCallback(
    (themeCode: string, valuesString: string) => {
      const values = valuesString
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      setThemeValues((prev) => {
        const newThemeValues = { ...prev, [themeCode]: values };
        onUpdate("variant_values", newThemeValues);
        return newThemeValues;
      });
    },
    [onUpdate],
  );

  const handleVariantChange = useCallback(
    (index: number, field: string, value: any) => {
      // Update the variants array
      setVariants((prev) => {
        const updated = prev.map((v, i) =>
          i === index ? { ...v, [field]: value } : v,
        );
        onUpdate("variants", updated);
        return updated;
      });

      // If this is the first variant and the field is a theme attribute, sync to main product
      if (index === 0 && selectedThemeCodes.includes(field)) {
        isSyncing.current = true;
        onUpdate(field, value);
        setTimeout(() => {
          isSyncing.current = false;
        }, 0);
      }
    },
    [onUpdate, selectedThemeCodes],
  );

  // ---- Render input ----
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
              onChange={(e) => {
                const val = e.target.value;
                handleVariantChange(
                  index,
                  field.code,
                  val === "" ? null : Number(val),
                );
              }}
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
    [handleVariantChange, productId],
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
                {variants.map((variant, index) => {
                  const rowKey = selectedThemeCodes
                    .map((code) => variant[code] as string)
                    .join("|");
                  return (
                    <tr key={`${rowKey}-${index}`}>
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
                  );
                })}
              </tbody>
            </table>
          </div>

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
