"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
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
  quantity: number;
}

interface VariantsManagerProps {
  productId: string;
  product?: any;
  attributes?: Attribute[];
  variantFields?: Attribute[];
  onUpdate: (field: string, value: any) => void;
}

const normalizeCode = (code?: string): string => {
  if (!code) return "";
  return code.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
};

const readProductValue = (obj: any, ...keys: string[]) => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
  }
  return undefined;
};

const cartesian = (arrays: string[][]): string[][] =>
  arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );

// Built-in variant fields that are always shown
const builtInVariantFields: Attribute[] = [
  {
    id: "sku",
    code: "sku",
    name: "SKU",
    type: "text",
    options: [],
  },
  {
    id: "price",
    code: "price",
    name: "Price",
    type: "number",
    options: [],
  },
  {
    id: "quantity",
    code: "quantity",
    name: "Quantity",
    type: "number",
    options: [],
  },
];

const VariantsManager: React.FC<VariantsManagerProps> = memo(
  ({ productId, product, attributes = [], variantFields = [], onUpdate }) => {
    // Merge built-in fields with provided variantFields, avoiding duplicates
    const allVariantFields = useMemo(() => {
      const existingCodes = new Set(
        variantFields.map((f) => normalizeCode(f.code)),
      );
      const merged = [...variantFields];
      builtInVariantFields.forEach((field) => {
        const code = normalizeCode(field.code);
        if (!existingCodes.has(code)) {
          merged.push(field);
        }
      });
      return merged;
    }, [variantFields]);

    const [selectedThemeCodes, setSelectedThemeCodes] = useState<string[]>([]);
    const [themeValues, setThemeValues] = useState<Record<string, string[]>>(
      {},
    );
    const [variants, setVariants] = useState<Variant[]>([]);

    const isInitializing = useRef(true);
    const prevProductId = useRef<string | null>(null);
    const prevProductThemes = useRef<string[]>([]);
    const prevProductValues = useRef<Record<string, string[]>>({});
    const isSyncing = useRef(false);
    const selectedThemeCodesRef = useRef<string[]>([]);

    // Keep ref in sync
    useEffect(() => {
      selectedThemeCodesRef.current = selectedThemeCodes;
    }, [selectedThemeCodes]);

    // ---- Reset when productId changes ----
    useEffect(() => {
      if (prevProductId.current !== productId) {
        prevProductId.current = productId;
        isInitializing.current = true;
        setSelectedThemeCodes([]);
        setThemeValues({});
        setVariants([]);
        prevProductThemes.current = [];
        prevProductValues.current = {};
      }
    }, [productId]);

    // ---- Initialize from product data (only when product data actually changes) ----
    useEffect(() => {
      if (!product || Object.keys(product).length === 0) return;

      const savedThemes =
        readProductValue(product, "variantThemes", "variant_themes") || [];
      const savedThemesNormalized = savedThemes.map((code: string) =>
        normalizeCode(code),
      );

      const savedValues =
        readProductValue(product, "variantValues", "variant_values") || {};
      // Normalize keys of savedValues to match our state keys
      const normalizedSavedValues: Record<string, string[]> = {};
      Object.entries(savedValues).forEach(([k, v]) => {
        const key = normalizeCode(k);
        const values = Array.isArray(v) ? v : v ? [v] : [];
        normalizedSavedValues[key] = values;
      });

      // Check if themes or values have actually changed from previous known state
      const themesChanged =
        savedThemesNormalized.length !== prevProductThemes.current.length ||
        savedThemesNormalized.some(
          (t: string, i: number) => t !== prevProductThemes.current[i],
        );

      const valuesChanged = Object.keys(normalizedSavedValues).some(
        (key: string) =>
          JSON.stringify(normalizedSavedValues[key]) !==
          JSON.stringify(prevProductValues.current[key] || []),
      );

      if (!themesChanged && !valuesChanged) {
        // Nothing changed, skip re-initialization
        isInitializing.current = false;
        return;
      }

      // Update refs with new data
      prevProductThemes.current = savedThemesNormalized;
      prevProductValues.current = normalizedSavedValues;

      // Apply new data to state
      const validThemes = savedThemes.filter((code: string) =>
        attributes.some((a) => normalizeCode(a.code) === normalizeCode(code)),
      );
      setSelectedThemeCodes(validThemes);

      const initialValues: Record<string, string[]> = {};
      attributes.forEach((attr) => {
        const normalizedAttrCode = normalizeCode(attr.code);
        initialValues[normalizedAttrCode] =
          normalizedSavedValues[normalizedAttrCode] || [];
      });
      setThemeValues(initialValues);

      const initialVariants = Array.isArray(product.variants)
        ? product.variants
        : [];
      setVariants(initialVariants);

      isInitializing.current = false;
    }, [product, attributes]);

    // ---- Generate variants when themes or values change ----
    const fieldKey = useMemo(
      () => allVariantFields.map((f) => f.code).join(","),
      [allVariantFields],
    );

    useEffect(() => {
      if (isInitializing.current) return;

      const themeCodes = selectedThemeCodes.map((code) => normalizeCode(code));
      const valueArrays = themeCodes.map((code) => themeValues[code] || []);

      if (
        themeCodes.length > 0 &&
        valueArrays.some((arr) => arr.length === 0)
      ) {
        if (variants.length > 0) {
          setVariants([]);
        }
        return;
      }

      if (themeCodes.length === 0) {
        // If no themes selected, keep existing variants (don't clear)
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
          allVariantFields.forEach((field) => {
            const code = normalizeCode(field.code);
            if (field.type === "number") variant[code] = null;
            else if (field.type === "file") variant[code] = [];
            else if (field.type === "boolean") variant[code] = false;
            else variant[code] = "";
          });
          // Ensure built-in fields have sensible defaults
          if (!variant.sku && variant.sku !== "") variant.sku = "";
          if (!variant.price && variant.price !== 0) variant.price = 0;
          if (!variant.quantity && variant.quantity !== 0) variant.quantity = 0;
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
    }, [
      selectedThemeCodes,
      themeValues,
      fieldKey,
      allVariantFields,
      onUpdate,
      variants,
    ]);

    // ---- Handlers (memoized) ----
    const handleThemeSelect = useCallback(
      (selectedOptions: any) => {
        const selectedCodes = selectedOptions
          ? selectedOptions.map((opt: any) => normalizeCode(opt.value))
          : [];
        setSelectedThemeCodes(selectedCodes);
        onUpdate("variantThemes", selectedCodes);

        // When themes change, we also need to update the product's main attribute values?
        // That's handled by the sync effect? We removed sync effect, so we'll just update state.
        // We'll keep the existing themeValues as they are, but the generation effect will
        // use the new selected themes and existing values.
        // However, if a theme is deselected, we might want to remove its values from state?
        // We'll keep them in state but they won't be used.
      },
      [onUpdate],
    );

    const handleThemeValuesChange = useCallback(
      (themeCode: string, valuesString: string) => {
        const normalizedThemeCode = normalizeCode(themeCode);
        const values = valuesString
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        setThemeValues((prev) => {
          const newThemeValues = { ...prev, [normalizedThemeCode]: values };
          onUpdate("variantValues", newThemeValues);
          return newThemeValues;
        });
      },
      [onUpdate],
    );

    const handleVariantChange = useCallback(
      (index: number, field: string, value: any) => {
        const normalizedField = normalizeCode(field);
        setVariants((prev) => {
          const updated = prev.map((v, i) =>
            i === index ? { ...v, [normalizedField]: value } : v,
          );
          onUpdate("variants", updated);
          return updated;
        });

        // If changing the first variant's theme attribute, also update the main product attribute
        // to keep it in sync with the first variant's value.
        if (index === 0 && selectedThemeCodes.includes(normalizedField)) {
          onUpdate(normalizedField, value);
        }
      },
      [onUpdate, selectedThemeCodes],
    );

    // ---- Render field input (memoized) ----
    const renderFieldInput = useCallback(
      (field: Attribute, variant: Variant, index: number) => {
        const fieldCode = normalizeCode(field.code);
        const value = variant[fieldCode] ?? "";
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
                    fieldCode,
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
                fieldCode={fieldCode}
                productId={productId}
                initialFiles={(variant[fieldCode] as string[]) || []}
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

    // ---- Memoized derived data ----
    const themeOptions = useMemo(
      () =>
        attributes.map((attr) => ({
          value: attr.code,
          label: attr.name || attr.code,
        })),
      [attributes],
    );

    const selectedOptions = useMemo(
      () =>
        themeOptions.filter((opt) => selectedThemeCodes.includes(opt.value)),
      [themeOptions, selectedThemeCodes],
    );

    // ---- Render ----
    const hasVariants = variants.length > 0;
    const hasThemes = attributes.length > 0;

    if (!hasThemes && !hasVariants) {
      return (
        <div className="text-sm text-gray-500">
          No variant themes defined for this group.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full overflow-auto">
        {hasThemes && (
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
        )}

        {selectedThemeCodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedThemeCodes.map((code) => {
              const attr = attributes.find((a) => a.code === code);
              if (!attr) return null;
              const normalizedCode = normalizeCode(code);
              return (
                <div key={code}>
                  <label className="block text-sm font-medium capitalize mb-1">
                    {attr.name || code} values
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    placeholder={`Enter ${attr.name || code} values, comma‑separated`}
                    value={themeValues[normalizedCode]?.join(", ") || ""}
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

        {hasVariants && (
          <>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {selectedThemeCodes.map((code) => (
                      <th
                        key={code}
                        className="border p-2 text-left capitalize"
                      >
                        {attributes.find((a) => a.code === code)?.name || code}
                      </th>
                    ))}
                    {allVariantFields.map((field) => (
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
                        {allVariantFields.map((field) => (
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
  },
);

export default VariantsManager;
