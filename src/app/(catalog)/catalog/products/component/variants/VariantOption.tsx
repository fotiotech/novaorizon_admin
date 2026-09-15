"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
  [key: string]: string | number | string[] | null | undefined;
  sku?: string;
  price?: number;
  quantity?: number;
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

const parseCommaInput = (s: string): string[] =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const ImagePreviewGrid: React.FC<{ files: string[] }> = ({ files }) => {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {files.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${url}-${i}`}
          src={url}
          alt={`Variant ${i + 1}`}
          className="w-12 h-12 object-cover border border-border rounded"
        />
      ))}
    </div>
  );
};

const VariantsManager: React.FC<VariantsManagerProps> = memo(
  ({ productId, product, attributes = [], variantFields = [], onUpdate }) => {
    // ---- Merged variant fields (user-defined + built-ins) --------------
    const allVariantFields = useMemo(() => {
      const existing = new Set(variantFields.map((f) => normalizeCode(f.code)));
      const merged = [...variantFields];
      builtInVariantFields.forEach((f) => {
        if (!existing.has(normalizeCode(f.code))) merged.push(f);
      });
      return merged;
    }, [variantFields]);

    // ---- Variants straight from the product (no local mirror) ----------
    const savedVariants = useMemo<any[]>(() => {
      return Array.isArray(product?.variants) ? product.variants : [];
    }, [product]);

    // ---- Theme codes: union of declared + inferred from variants -------
    const productThemes = useMemo<string[]>(() => {
      const raw = readProductValue(product, "variantThemes", "variant_themes");
      if (!Array.isArray(raw)) return [];
      return raw.map((c) => normalizeCode(c)).filter(Boolean);
    }, [product]);

    const themesFromVariants = useMemo<string[]>(() => {
      if (!savedVariants.length) return [];
      const attrCodes = new Set(attributes.map((a) => normalizeCode(a.code)));
      const reserved = new Set([
        "sku",
        "price",
        "quantity",
        "images",
        "mainImage",
        "attributes",
        "_id",
      ]);
      const seen = new Set<string>();
      savedVariants.forEach((v) => {
        if (!v || typeof v !== "object") return;
        Object.keys(v).forEach((k) => {
          const key = normalizeCode(k);
          if (!key || reserved.has(key)) return;
          if (attrCodes.size > 0 && !attrCodes.has(key)) return;
          const val = (v as any)[key];
          if (typeof val === "string" && val) seen.add(key);
        });
      });
      return Array.from(seen);
    }, [savedVariants, attributes]);

    const selectedThemeCodes = useMemo<string[]>(() => {
      const attrCodes = new Set(attributes.map((a) => normalizeCode(a.code)));
      const union = new Set<string>();
      productThemes.forEach((c) => {
        if (attrCodes.size === 0 || attrCodes.has(c)) union.add(c);
      });
      themesFromVariants.forEach((c) => {
        if (attrCodes.size === 0 || attrCodes.has(c)) union.add(c);
      });
      return Array.from(union);
    }, [productThemes, themesFromVariants, attributes]);

    // ---- Theme value lists: variantValues, with fallback to variants ----
    //
    // FIX: fallback derivation from `variants` only fires when the theme key
    // is ABSENT from `variantValues`. If the user has explicitly set an empty
    // array (e.g. cleared the input), we respect that and do NOT re-derive.
    const savedValues = useMemo<Record<string, string[]>>(() => {
      const raw = readProductValue(product, "variantValues", "variant_values");
      const out: Record<string, string[]> = {};

      const absorbObject = (obj: Record<string, any>) => {
        Object.entries(obj).forEach(([k, v]) => {
          const key = normalizeCode(k);
          if (!key) return;
          out[key] = Array.isArray(v)
            ? v.filter((x): x is string => typeof x === "string")
            : v != null
              ? [String(v)]
              : [];
        });
      };

      if (Array.isArray(raw)) {
        const isKvArray =
          raw.length > 0 &&
          raw.every(
            (x: any) => x && typeof x === "object" && "k" in x && "v" in x,
          );
        if (isKvArray) {
          raw.forEach((entry: any) => {
            const key = normalizeCode(entry.k);
            if (!key) return;
            out[key] = Array.isArray(entry.v)
              ? entry.v
              : entry.v != null
                ? [String(entry.v)]
                : [];
          });
        } else if (raw.length === 1 && raw[0] && typeof raw[0] === "object") {
          absorbObject(raw[0]);
        }
      } else if (raw && typeof raw === "object") {
        absorbObject(raw);
      }

      selectedThemeCodes.forEach((theme) => {
        // ⬇ Only fall back when the key is entirely missing — not when the
        //   user has explicitly set it to an empty array.
        if (Object.prototype.hasOwnProperty.call(out, theme)) return;

        const uniq = new Set<string>();
        savedVariants.forEach((v: any) => {
          const val = v?.[theme];
          if (val != null && val !== "") uniq.add(String(val));
        });
        out[theme] = Array.from(uniq);
      });

      return out;
    }, [product, savedVariants, selectedThemeCodes]);

    // ---- Raw text buffer for the "X values" inputs ---------------------
    const [themeValueInputs, setThemeValueInputs] = useState<
      Record<string, string>
    >({});

    useEffect(() => {
      setThemeValueInputs((prev) => {
        let next = prev;
        for (const [k, v] of Object.entries(savedValues)) {
          const incoming = v.join(", ");
          const currentRaw = prev[k];
          const currentParsed =
            currentRaw !== undefined
              ? parseCommaInput(currentRaw).join(", ")
              : "";
          if (currentParsed !== incoming) {
            if (next === prev) next = { ...prev };
            next[k] = incoming;
          }
        }
        for (const k of Object.keys(next)) {
          if (!(k in savedValues)) {
            if (next === prev) next = { ...prev };
            delete next[k];
          }
        }
        return next;
      });
    }, [savedValues]);

    // ---------------------------------------------------------------------
    // Regenerator — with POSITIONAL PATCHING for legacy variants that are
    // missing theme keys.
    //
    // 1. For every existing variant lacking one or more theme keys, patch
    //    the missing keys using the combination at the same index. This
    //    recovers legacy data (theme keys stripped by older schemas) and
    //    preserves every other property (price, sku, images, …).
    // 2. Rebuild the key-based lookup from the patched set.
    // 3. If the desired combination set matches, bail — no update needed.
    // 4. Otherwise add/remove variants, preserving objects by reference.
    // ---------------------------------------------------------------------
    useEffect(() => {
      if (selectedThemeCodes.length === 0) return;
      const valueArrays = selectedThemeCodes.map((c) => savedValues[c] || []);
      if (valueArrays.some((a) => a.length === 0)) return;

      const combinations = cartesian(valueArrays);
      const desiredKeys = combinations.map((combo) => combo.join("|"));
      const desiredKeySet = new Set(desiredKeys);

      // ---- Pass 1: positional patch of missing theme keys ----
      let anyPatched = false;
      const patchedSaved = savedVariants.map((v, i) => {
        const missing = selectedThemeCodes.some(
          (c) => v?.[c] === undefined || v?.[c] === null || v?.[c] === "",
        );
        if (!missing) return v;
        const combo = combinations[i];
        if (!combo) return v;
        const patched = { ...v };
        selectedThemeCodes.forEach((c, j) => {
          const cur = patched[c];
          if (cur === undefined || cur === null || cur === "") {
            patched[c] = combo[j];
          }
        });
        anyPatched = true;
        return patched;
      });

      // ---- Pass 2: key-based lookup over the (possibly patched) set ----
      const existingByKey = new Map<string, any>();
      patchedSaved.forEach((v) => {
        const key = selectedThemeCodes.map((c) => v?.[c] ?? "").join("|");
        existingByKey.set(key, v);
      });

      const existingKeys = Array.from(existingByKey.keys());
      const sameSet =
        existingKeys.length === desiredKeys.length &&
        existingKeys.every((k) => desiredKeySet.has(k));

      // If nothing needed patching AND the key set matches, we're done.
      if (sameSet && !anyPatched) return;

      // ---- Pass 3: add missing, drop orphans, preserve by reference ----
      const nextVariants = desiredKeys.map((key, i) => {
        const existing = existingByKey.get(key);
        if (existing) return existing;
        const combo = combinations[i];
        const variant: any = {};
        selectedThemeCodes.forEach((c, j) => (variant[c] = combo[j]));
        allVariantFields.forEach((f) => {
          const c = normalizeCode(f.code);
          if (f.type === "number") variant[c] = 0;
          else if (f.type === "file") variant[c] = [];
          else if (f.type === "boolean") variant[c] = false;
          else variant[c] = "";
        });
        return variant;
      });

      onUpdate("variants", nextVariants);
    }, [
      selectedThemeCodes,
      savedValues,
      savedVariants,
      allVariantFields,
      onUpdate,
    ]);

    // ---- Refs for debounced / race-free writes -------------------------
    const savedValuesRef = useRef(savedValues);
    useEffect(() => {
      savedValuesRef.current = savedValues;
    }, [savedValues]);

    const savedVariantsRef = useRef<any[]>(savedVariants);
    useEffect(() => {
      savedVariantsRef.current = savedVariants;
    }, [savedVariants]);

    const valuesDebounceRef = useRef<
      Record<string, ReturnType<typeof setTimeout>>
    >({});

    // Cancel any pending debounced writes on unmount.
    useEffect(() => {
      const timers = valuesDebounceRef.current;
      return () => {
        Object.values(timers).forEach(clearTimeout);
      };
    }, []);

    // ---- Handlers -----------------------------------------------------
    //
    // Theme select (add/remove) writes IMMEDIATELY — it's a discrete action
    // and the regenerator must see it right away.
    const handleThemeSelect = useCallback(
      (selectedOptions: any) => {
        const codes = Array.isArray(selectedOptions)
          ? selectedOptions.map((o: any) => normalizeCode(o.value))
          : [];
        onUpdate("variantThemes", codes);
      },
      [onUpdate],
    );

    // Theme values (free text) is DEBOUNCED — typing "Red, Blue" used to
    // fire onUpdate per keystroke, causing the regenerator to churn the
    // variant table and lose in-flight edits.
    const handleThemeValuesChange = useCallback(
      (themeCode: string, valuesString: string) => {
        const key = normalizeCode(themeCode);
        setThemeValueInputs((prev) => ({ ...prev, [key]: valuesString }));

        const timers = valuesDebounceRef.current;
        if (timers[key]) clearTimeout(timers[key]);
        timers[key] = setTimeout(() => {
          delete timers[key];
          const parsed = parseCommaInput(valuesString);
          const next = { ...savedValuesRef.current, [key]: parsed };
          onUpdate("variantValues", next);
        }, 400);
      },
      [onUpdate],
    );

    // ✅ Read/write through a ref so rapid successive edits never race.
    const handleVariantChange = useCallback(
      (index: number, field: string, value: any) => {
        const key = normalizeCode(field);
        const current = savedVariantsRef.current;
        if (index < 0 || index >= current.length) return;
        const updated = current.map((v, i) =>
          i === index ? { ...v, [key]: value } : v,
        );
        savedVariantsRef.current = updated;
        onUpdate("variants", updated);
      },
      [onUpdate],
    );

    const renderFieldInput = useCallback(
      (field: Attribute, variant: Variant, index: number) => {
        const fieldCode = normalizeCode(field.code);
        const value = variant?.[fieldCode] ?? "";
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
                    v === "" ? 0 : Number(v),
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
          case "file": {
            const raw = variant?.[fieldCode];
            const files: string[] = Array.isArray(raw) ? raw : [];
            return (
              <div className="flex flex-col gap-2">
                <VariantImageUploader
                  index={index}
                  fieldCode={fieldCode}
                  productId={productId}
                  initialFiles={files}
                  handleVariantChange={handleVariantChange}
                />
                <ImagePreviewGrid files={files} />
              </div>
            );
          }
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

    const hasVariants = savedVariants.length > 0;
    const hasThemes = attributes.length > 0 || selectedThemeCodes.length > 0;

    if (!hasThemes && !hasVariants) {
      return (
        <div className="text-sm text-muted-foreground">
          No variant themes defined for this group.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full overflow-auto">
        {attributes.length > 0 && (
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
              const displayName = attr?.name || code;
              return (
                <div key={code}>
                  <label className="block text-sm font-medium capitalize text-foreground mb-1">
                    {displayName} values
                  </label>
                  <input
                    type="text"
                    className="w-full border border-input rounded p-2 bg-background text-foreground"
                    placeholder={`Enter ${displayName} values, comma-separated`}
                    value={themeValueInputs[code] ?? ""}
                    onChange={(e) =>
                      handleThemeValuesChange(code, e.target.value)
                    }
                  />
                  {attr?.options && attr.options.length > 0 && (
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
                  {savedVariants.map((variant, index) => {
                    const rowKey = selectedThemeCodes
                      .map((code) => variant?.[code] as string)
                      .join("|");
                    return (
                      <tr key={`${rowKey}-${index}`}>
                        {selectedThemeCodes.map((code) => (
                          <td
                            key={code}
                            className="border border-border p-2 text-foreground"
                          >
                            {(variant?.[code] as string) ?? ""}
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
                <span className="font-semibold">{savedVariants.length}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {savedVariants.map((v, idx) => {
                  const label = selectedThemeCodes
                    .map((code) => v?.[code] as string)
                    .join(" - ");
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-primary/15 text-primary rounded text-xs"
                    >
                      {label || "(unlabeled)"}
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
