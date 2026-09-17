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
import { Layers, Info } from "@mui/icons-material";

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

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_SM =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-muted-foreground";

const SELECT_STYLES = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.25)" : "none",
    minHeight: "38px",
    fontSize: "0.875rem",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    "&:hover": {
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--border))",
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    overflow: "hidden",
    boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
  }),
  menuPortal: (provided: any) => ({ ...provided, zIndex: 9999 }),
  menuList: (provided: any) => ({ ...provided, padding: 4 }),
  option: (provided: any, state: any) => ({
    ...provided,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected
      ? "hsl(var(--primary))"
      : state.isFocused
        ? "hsl(var(--accent))"
        : "hsl(var(--popover))",
    color: state.isSelected
      ? "hsl(var(--primary-foreground))"
      : "hsl(var(--popover-foreground))",
    cursor: "pointer",
    borderRadius: "0.375rem",
  }),
  multiValue: (p: any) => ({
    ...p,
    backgroundColor: "hsl(var(--secondary))",
    borderRadius: "0.375rem",
  }),
  multiValueLabel: (p: any) => ({
    ...p,
    color: "hsl(var(--secondary-foreground))",
    fontSize: "0.8125rem",
  }),
  multiValueRemove: (p: any) => ({
    ...p,
    color: "hsl(var(--secondary-foreground))",
    "&:hover": {
      backgroundColor: "hsl(var(--destructive))",
      color: "hsl(var(--destructive-foreground))",
    },
  }),
  placeholder: (p: any) => ({ ...p, color: "hsl(var(--muted-foreground))" }),
  input: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  singleValue: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  indicatorSeparator: (p: any) => ({
    ...p,
    backgroundColor: "hsl(var(--border))",
  }),
  dropdownIndicator: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    "&:hover": { color: "hsl(var(--foreground))" },
  }),
  clearIndicator: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    "&:hover": { color: "hsl(var(--foreground))" },
  }),
  noOptionsMessage: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
  }),
} as const;

const parseCommaInput = (s: string): string[] =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const ImagePreviewGrid: React.FC<{ files: string[] }> = ({ files }) => {
  if (!files.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {files.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${url}-${i}`}
          src={url}
          alt={`Variant ${i + 1}`}
          className="h-10 w-10 rounded-md border border-border object-cover"
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
    // Regenerator — with POSITIONAL PATCHING for legacy variants
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

    useEffect(() => {
      const timers = valuesDebounceRef.current;
      return () => {
        Object.values(timers).forEach(clearTimeout);
      };
    }, []);

    // ---- Handlers -----------------------------------------------------
    const handleThemeSelect = useCallback(
      (selectedOptions: any) => {
        const codes = Array.isArray(selectedOptions)
          ? selectedOptions.map((o: any) => normalizeCode(o.value))
          : [];
        onUpdate("variantThemes", codes);
      },
      [onUpdate],
    );

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
                <option value="">Select…</option>
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
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          No variant themes defined for this group.
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col gap-5">
        {/* Theme selector */}
        {attributes.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <label className={LABEL_CLASS}>Themes</label>
            <Select
              isMulti
              options={themeOptions}
              value={selectedOptions}
              onChange={handleThemeSelect}
              placeholder="Choose themes to generate variants…"
              styles={SELECT_STYLES}
              classNamePrefix="react-select"
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : undefined
              }
              menuPosition="fixed"
              menuShouldScrollIntoView={false}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Variants will be generated from the cartesian product of each
              theme's values.
            </p>
          </div>
        )}

        {/* Theme value inputs */}
        {selectedThemeCodes.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {selectedThemeCodes.map((code) => {
              const attr = attributes.find(
                (a) => normalizeCode(a.code) === code,
              );
              const displayName = attr?.name || code;
              return (
                <div key={code}>
                  <label className={LABEL_CLASS}>
                    <span className="capitalize">{displayName}</span> values
                  </label>
                  <input
                    type="text"
                    className={INPUT_SM}
                    placeholder={`e.g. ${attr?.options?.slice(0, 3).join(", ") || "comma, separated, values"}`}
                    value={themeValueInputs[code] ?? ""}
                    onChange={(e) =>
                      handleThemeValuesChange(code, e.target.value)
                    }
                  />
                  {attr?.options && attr.options.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        Suggested:
                      </span>
                      {attr.options.slice(0, 6).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const current = parseCommaInput(
                              themeValueInputs[code] ?? "",
                            );
                            if (current.includes(opt)) return;
                            const next = [...current, opt].join(", ");
                            handleThemeValuesChange(code, next);
                          }}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        >
                          + {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Variant table */}
        {hasVariants && (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {selectedThemeCodes.map((code) => (
                      <th
                        key={code}
                        className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        <span className="capitalize">
                          {attributes.find(
                            (a) => normalizeCode(a.code) === code,
                          )?.name || code}
                        </span>
                      </th>
                    ))}
                    {allVariantFields.map((field) => (
                      <th
                        key={field.code}
                        className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {field.name || field.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {savedVariants.map((variant, index) => {
                    const rowKey = selectedThemeCodes
                      .map((code) => variant?.[code] as string)
                      .join("|");
                    return (
                      <tr
                        key={`${rowKey}-${index}`}
                        className="transition-colors hover:bg-muted/30"
                      >
                        {selectedThemeCodes.map((code) => (
                          <td
                            key={code}
                            className="whitespace-nowrap px-3 py-2.5"
                          >
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                              {(variant?.[code] as string) ?? "—"}
                            </span>
                          </td>
                        ))}
                        {allVariantFields.map((field) => (
                          <td key={field.code} className="px-3 py-2.5">
                            {renderFieldInput(field, variant, index)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers fontSize="small" className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    Variant summary
                  </span>
                </div>
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {savedVariants.length}{" "}
                  {savedVariants.length === 1 ? "variant" : "variants"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {savedVariants.map((v, idx) => {
                  const label = selectedThemeCodes
                    .map((code) => v?.[code] as string)
                    .join(" · ");
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground ring-1 ring-inset ring-border"
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
