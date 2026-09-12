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

const normalizeCode = (code?: string): string =>
  !code ? "" : code.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const readProductValue = (obj: any, ...keys: string[]) => {
  if (!obj) return undefined;
  for (const key of keys) if (obj[key] !== undefined) return obj[key];
  return undefined;
};

const cartesian = (arrays: string[][]): string[][] =>
  arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );

const builtInVariantFields: Attribute[] = [
  { id: "sku", code: "sku", name: "SKU", type: "text", options: [] },
  { id: "price", code: "price", name: "Price", type: "number", options: [] },
  {
    id: "quantity",
    code: "quantity",
    name: "Quantity",
    type: "number",
    options: [],
  },
];

const INPUT_SM =
  "w-full p-1 border border-input rounded bg-background text-foreground";

const VariantsManager: React.FC<VariantsManagerProps> = memo(
  ({ productId, product, attributes = [], variantFields = [], onUpdate }) => {
    const allVariantFields = useMemo(() => {
      const existing = new Set(variantFields.map((f) => normalizeCode(f.code)));
      const merged = [...variantFields];
      builtInVariantFields.forEach((f) => {
        if (!existing.has(normalizeCode(f.code))) merged.push(f);
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
    const selectedThemeCodesRef = useRef<string[]>([]);

    useEffect(() => {
      selectedThemeCodesRef.current = selectedThemeCodes;
    }, [selectedThemeCodes]);

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

    useEffect(() => {
      if (!product || Object.keys(product).length === 0) return;
      const savedThemes =
        readProductValue(product, "variantThemes", "variant_themes") || [];
      const savedThemesNormalized = savedThemes.map((c: string) =>
        normalizeCode(c),
      );
      const savedValues =
        readProductValue(product, "variantValues", "variant_values") || {};
      const normalizedSavedValues: Record<string, string[]> = {};
      Object.entries(savedValues).forEach(([k, v]) => {
        const key = normalizeCode(k);
        const values = Array.isArray(v) ? v : v ? [v] : [];
        normalizedSavedValues[key] = values;
      });
      const themesChanged =
        savedThemesNormalized.length !== prevProductThemes.current.length ||
        savedThemesNormalized.some(
          (t: string, i: number) => t !== prevProductThemes.current[i],
        );
      const valuesChanged = Object.keys(normalizedSavedValues).some(
        (key) =>
          JSON.stringify(normalizedSavedValues[key]) !==
          JSON.stringify(prevProductValues.current[key] || []),
      );
      if (!themesChanged && !valuesChanged) {
        isInitializing.current = false;
        return;
      }
      prevProductThemes.current = savedThemesNormalized;
      prevProductValues.current = normalizedSavedValues;
      const validThemes = savedThemes.filter((code: string) =>
        attributes.some((a) => normalizeCode(a.code) === normalizeCode(code)),
      );
      setSelectedThemeCodes(validThemes);
      const initialValues: Record<string, string[]> = {};
      attributes.forEach((attr) => {
        const key = normalizeCode(attr.code);
        initialValues[key] = normalizedSavedValues[key] || [];
      });
      setThemeValues(initialValues);
      setVariants(Array.isArray(product.variants) ? product.variants : []);
      isInitializing.current = false;
    }, [product, attributes]);

    const fieldKey = useMemo(
      () => allVariantFields.map((f) => f.code).join(","),
      [allVariantFields],
    );

    useEffect(() => {
      if (isInitializing.current) return;
      const themeCodes = selectedThemeCodes.map((c) => normalizeCode(c));
      const valueArrays = themeCodes.map((c) => themeValues[c] || []);
      if (themeCodes.length > 0 && valueArrays.some((a) => a.length === 0)) {
        if (variants.length > 0) setVariants([]);
        return;
      }
      if (themeCodes.length === 0) return;
      const combinations = cartesian(valueArrays);
      const existingMap = new Map<string, Variant>();
      variants.forEach((v) => {
        const key = themeCodes.map((c) => v[c] as string).join("|");
        existingMap.set(key, v);
      });
      const newVariants = combinations.map((combo) => {
        const variant: any = {};
        themeCodes.forEach((c, i) => (variant[c] = combo[i]));
        const key = combo.join("|");
        const existing = existingMap.get(key);
        if (existing) {
          const themeSet = new Set(themeCodes);
          Object.keys(existing).forEach((f) => {
            if (!themeSet.has(f)) variant[f] = existing[f];
          });
        } else {
          allVariantFields.forEach((f) => {
            const c = normalizeCode(f.code);
            if (f.type === "number") variant[c] = null;
            else if (f.type === "file") variant[c] = [];
            else if (f.type === "boolean") variant[c] = false;
            else variant[c] = "";
          });
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

    const handleThemeSelect = useCallback(
      (selectedOptions: any) => {
        const codes = selectedOptions
          ? selectedOptions.map((o: any) => normalizeCode(o.value))
          : [];
        setSelectedThemeCodes(codes);
        onUpdate("variantThemes", codes);
      },
      [onUpdate],
    );

    const handleThemeValuesChange = useCallback(
      (themeCode: string, valuesString: string) => {
        const key = normalizeCode(themeCode);
        const values = valuesString
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        setThemeValues((prev) => {
          const next = { ...prev, [key]: values };
          onUpdate("variantValues", next);
          return next;
        });
      },
      [onUpdate],
    );

    const handleVariantChange = useCallback(
      (index: number, field: string, value: any) => {
        const key = normalizeCode(field);
        setVariants((prev) => {
          const updated = prev.map((v, i) =>
            i === index ? { ...v, [key]: value } : v,
          );
          onUpdate("variants", updated);
          return updated;
        });
        if (index === 0 && selectedThemeCodes.includes(key)) {
          onUpdate(key, value);
        }
      },
      [onUpdate, selectedThemeCodes],
    );

    const renderFieldInput = useCallback(
      (field: Attribute, variant: Variant, index: number) => {
        const fieldCode = normalizeCode(field.code);
        const value = variant[fieldCode] ?? "";
        switch (field.type) {
          case "number":
            return (
              <input
                type="number"
                className={INPUT_SM}
                value={value as any}
                onChange={(e) => {
                  const v = e.target.value;
                  handleVariantChange(
                    index,
                    fieldCode,
                    v === "" ? null : Number(v),
                  );
                }}
              />
            );
          case "select":
            return (
              <select
                className={INPUT_SM}
                value={value as any}
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
                className={INPUT_SM}
                value={value as any}
                onChange={(e) =>
                  handleVariantChange(index, field.code, e.target.value)
                }
              />
            );
        }
      },
      [handleVariantChange, productId],
    );

    const themeOptions = useMemo(
      () =>
        attributes.map((attr) => ({
          value: normalizeCode(attr.code),
          label: attr.name || attr.code,
        })),
      [attributes],
    );

    const selectedOptions = useMemo(
      () => themeOptions.filter((o) => selectedThemeCodes.includes(o.value)),
      [themeOptions, selectedThemeCodes],
    );

    const hasVariants = variants.length > 0;
    const hasThemes = attributes.length > 0;

    if (!hasThemes && !hasVariants) {
      return (
        <div className="text-sm text-muted-foreground">
          No variant themes defined for this group.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full overflow-auto">
        {hasThemes && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
              const attr = attributes.find(
                (a) => normalizeCode(a.code) === code,
              );
              if (!attr) return null;
              const normalizedCode = normalizeCode(code);
              return (
                <div key={code}>
                  <label className="block text-sm font-medium capitalize text-foreground mb-1">
                    {attr.name || code} values
                  </label>
                  <input
                    type="text"
                    className="w-full border border-input rounded p-2 bg-background text-foreground"
                    placeholder={`Enter ${attr.name || code} values, comma-separated`}
                    value={themeValues[normalizedCode]?.join(", ") || ""}
                    onChange={(e) =>
                      handleThemeValuesChange(code, e.target.value)
                    }
                  />
                  {attr.options && attr.options.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
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
                  <tr className="bg-muted">
                    {selectedThemeCodes.map((code) => (
                      <th
                        key={code}
                        className="border border-border p-2 text-left capitalize text-foreground"
                      >
                        {attributes.find((a) => normalizeCode(a.code) === code)
                          ?.name || code}
                      </th>
                    ))}
                    {allVariantFields.map((field) => (
                      <th
                        key={field.code}
                        className="border border-border p-2 text-left capitalize text-foreground"
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
                          <td
                            key={code}
                            className="border border-border p-2 text-foreground"
                          >
                            {variant[code] as string}
                          </td>
                        ))}
                        {allVariantFields.map((field) => (
                          <td
                            key={field.code}
                            className="border border-border p-2"
                          >
                            {renderFieldInput(field, variant, index)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded border border-border">
              <div className="text-sm font-medium text-foreground">
                Variant Summary
              </div>
              <div className="text-xs text-muted-foreground mt-1">
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
                      className="px-2 py-0.5 bg-primary/15 text-primary rounded text-xs"
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
