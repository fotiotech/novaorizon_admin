"use client";

import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import Select, { MultiValue } from "react-select";
import FilesUploader from "../../../../../components/FilesUploader";
import { getBrands } from "@/app/actions/brand";
import { getCarriers } from "@/app/actions/carrier";
import { Brand } from "@/constant/types";
import RichTextEditorWrapper from "./RichTextEditorWrapper";
import { useFileUploader } from "@/hooks/useFileUploader";

interface Carrier {
  _id: string;
  name: string;
}

// ------------------------------------------------------------------
// Field value shapes — one per "field kind" the form supports.
// ------------------------------------------------------------------
type UnitValue = { value: number | ""; unit?: string };
type NumberFieldValue = number | "" | UnitValue | null | undefined;
type StringFieldValue = string | null | undefined;
type ArrayFieldValue = string[] | null | undefined;

// Guards
const isUnitValue = (v: unknown): v is UnitValue =>
  typeof v === "object" && v !== null && "value" in v;
const asString = (v: unknown): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const asNumberInput = (v: NumberFieldValue): number | "" => {
  if (v == null || v === "") return "";
  if (typeof v === "number") return v;
  if (isUnitValue(v)) return v.value;
  return "";
};

interface FieldProps {
  type?: string;
  code: string;
  name?: string;
  field?: unknown;
  option?: any[];
  handleAttributeChange: (code: string, value: any) => void;
  productId?: string;
  unitFamily?: { id: string; name: string } | null;
  units?: any[];
  isRequired?: boolean;
}

// ------------------------------------------------------------------
// Shared class tokens — every native input uses these so dark mode is
// consistent and there is a single source of truth.
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-muted-foreground";
const CHECK_BORDER = "border-input";
const CHECK_BG = "bg-primary border-primary";

// ------------------------------------------------------------------
// Static select styles (theme-aware)
// ------------------------------------------------------------------
const customSelectStyles = {
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
  singleValue: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  placeholder: (p: any) => ({ ...p, color: "hsl(var(--muted-foreground))" }),
  input: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
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
  loadingIndicator: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
  }),
  noOptionsMessage: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
  }),
} as const;

const PORTAL_PROPS = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  menuPosition: "fixed" as const,
  menuShouldScrollIntoView: false,
  isSearchable: false,
  blurInputOnSelect: true,
} as const;

// ------------------------------------------------------------------
// Gallery uploader
// ------------------------------------------------------------------
const GalleryUploaderWrapper: React.FC<{
  productId: string;
  field: string[];
  code: string;
  handleAttributeChange: (code: string, value: any) => void;
}> = memo(({ productId, field, code, handleAttributeChange }) => {
  const initialFiles = Array.isArray(field) ? field : [];
  const { files, addFiles, removeFile, loading, progressByName } =
    useFileUploader(productId, initialFiles, "images");

  useEffect(() => {
    const currentValue = Array.isArray(field) ? field : [];
    if (
      files.length !== currentValue.length ||
      files.some((url, i) => url !== currentValue[i])
    ) {
      handleAttributeChange(code, files);
    }
  }, [files, field, handleAttributeChange, code]);

  return (
    <FilesUploader
      files={files}
      addFiles={addFiles}
      onRemove={removeFile}
      loading={loading}
      progressByName={progressByName}
    />
  );
});
GalleryUploaderWrapper.displayName = "GalleryUploaderWrapper";

// ------------------------------------------------------------------
// Main Fields component
// ------------------------------------------------------------------
const Fields: React.FC<FieldProps> = React.memo(
  ({
    type,
    code,
    name,
    field,
    option = [],
    handleAttributeChange,
    productId,
    unitFamily,
    units,
    isRequired,
  }) => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let isActive = true;
      const loadOptions = async () => {
        try {
          if (code === "brand") {
            const data = await getBrands();
            if (isActive) setBrands(data);
          }
          if (code === "carrier") {
            const data = await getCarriers();
            if (isActive) setCarriers(data);
          }
        } catch (err) {
          console.error(`Failed to load ${code} options:`, err);
          if (isActive) setError("Failed to fetch options. Please refresh.");
        }
      };
      if (code === "brand" || code === "carrier") void loadOptions();
      return () => {
        isActive = false;
      };
    }, [code]);

    const brandOptions = useMemo(
      () =>
        (brands || [])
          .filter(Boolean)
          .map((b: any) => ({
            value: b?._id ? String(b._id) : "",
            label: b?.name || "Unnamed brand",
          }))
          .filter((o) => o.value),
      [brands],
    );

    const carrierOptions = useMemo(
      () => (carriers || []).map((c) => ({ value: c._id, label: c.name })),
      [carriers],
    );

    const genericOptions = useMemo(
      () => option.map((v) => ({ value: v, label: v })),
      [option],
    );

    const handleBrandChange = useCallback(
      (opt: { value: string } | null) =>
        handleAttributeChange(code, opt ? opt.value : null),
      [handleAttributeChange, code],
    );
    const handleCarrierChange = useCallback(
      (opt: { value: string } | null) =>
        handleAttributeChange(code, opt ? opt.value : null),
      [handleAttributeChange, code],
    );
    const handleGenericChange = useCallback(
      (opt: { value: string } | null) =>
        handleAttributeChange(code, opt ? opt.value : null),
      [handleAttributeChange, code],
    );

    const selectedBrandId = useMemo(() => {
      const candidate = isUnitValue(field)
        ? field.value
        : typeof field === "object" && field !== null
          ? ((field as any)._id ?? (field as any).id ?? (field as any).value)
          : Array.isArray(field)
            ? field[0]
            : field;
      if (!candidate) return "";
      if (typeof candidate === "object") {
        const nested =
          (candidate as any)._id ??
          (candidate as any).id ??
          (candidate as any).value;
        return nested ? String(nested) : "";
      }
      return String(candidate);
    }, [field]);

    const rawCarrier = useMemo(() => {
      if (Array.isArray(field)) return field[0];
      if (typeof field === "object" && field !== null) {
        const o = field as any;
        return o._id || o.id || o.value || "";
      }
      return (field as string) || "";
    }, [field]);

    const selectedMultiValues = useMemo(
      () => asStringArray(field).map((v) => ({ value: v, label: v })),
      [field],
    );

    const renderField = () => {
      switch (type) {
        case "file":
          if (code === "images") {
            return (
              <GalleryUploaderWrapper
                productId={productId || ""}
                field={asStringArray(field)}
                code={code}
                handleAttributeChange={handleAttributeChange}
              />
            );
          }
          return (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              File field <code className="font-mono">{code}</code> has no
              uploader configured.
            </div>
          );

        case "text":
          return (
            <input
              type="text"
              className={INPUT_CLASS}
              value={asString(field as StringFieldValue)}
              placeholder={`Enter ${name}`}
              onChange={(e) => handleAttributeChange(code, e.target.value)}
              required={isRequired}
              aria-required={isRequired}
            />
          );

        case "textarea":
          if (code === "description") {
            return (
              <RichTextEditorWrapper
                value={asString(field as StringFieldValue)}
                onChange={(html: any) => handleAttributeChange(code, html)}
                placeholder={`Enter ${name}`}
                productId={productId || ""}
              />
            );
          }
          return (
            <textarea
              className={`${INPUT_CLASS} resize-y`}
              value={asString(field as StringFieldValue)}
              placeholder={`Enter ${name}`}
              onChange={(e) => handleAttributeChange(code, e.target.value)}
              required={isRequired}
              rows={4}
            />
          );

        case "number": {
          const familyId = unitFamily?.id;
          const familyUnits = familyId
            ? (units || []).filter((u) => {
                const uFamilyId = u.unitFamily?.id || u.unitFamily;
                return uFamilyId === familyId;
              })
            : [];

          const unitValue = isUnitValue(field) ? field : null;
          const currentValue = unitValue
            ? unitValue.value
            : (field as number | "");
          const currentUnit = unitValue?.unit;

          const numberInput = (
            <input
              type="number"
              className={INPUT_CLASS}
              value={asNumberInput(currentValue as NumberFieldValue)}
              onChange={(e) => {
                const newValue =
                  e.target.value === "" ? "" : Number(e.target.value);
                if (familyUnits.length > 0 && currentUnit) {
                  handleAttributeChange(code, {
                    value: newValue,
                    unit: currentUnit,
                  });
                } else {
                  handleAttributeChange(code, newValue);
                }
              }}
              required={isRequired}
              aria-required={isRequired}
            />
          );

          if (familyUnits.length > 0) {
            const unitOptions = familyUnits.map((u) => ({
              value: u.symbol,
              label: u.symbol,
            }));
            return (
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">{numberInput}</div>
                <Select
                  options={unitOptions}
                  value={
                    unitOptions.find((opt) => opt.value === currentUnit) || null
                  }
                  onChange={(opt: any) => {
                    const newUnit = opt?.value;
                    const newVal =
                      currentValue !== undefined && newUnit
                        ? { value: currentValue, unit: newUnit }
                        : currentValue !== undefined && !newUnit
                          ? currentValue
                          : "";
                    handleAttributeChange(code, newVal);
                  }}
                  className="w-28"
                  classNamePrefix="react-select"
                  placeholder="Unit"
                  isClearable={!isRequired}
                  styles={customSelectStyles}
                  {...PORTAL_PROPS}
                />
              </div>
            );
          }
          return numberInput;
        }

        case "select": {
          if (code === "brand") {
            const selected =
              brandOptions.find((o) => o.value === selectedBrandId) ?? null;
            return (
              <Select
                options={brandOptions}
                value={selected}
                onChange={handleBrandChange}
                styles={customSelectStyles}
                classNamePrefix="react-select"
                required={isRequired}
                placeholder="Select brand…"
                isLoading={brands.length === 0 && !error}
                {...PORTAL_PROPS}
              />
            );
          }
          if (code === "carrier") {
            return (
              <Select
                options={carrierOptions}
                value={
                  carrierOptions.find((o) => o.value === rawCarrier) ?? null
                }
                onChange={handleCarrierChange}
                styles={customSelectStyles}
                classNamePrefix="react-select"
                required={isRequired}
                placeholder="Select carrier…"
                {...PORTAL_PROPS}
              />
            );
          }
          const selectedValue =
            asStringArray(field)[0] ?? asString(field as StringFieldValue);
          const current = option.includes(selectedValue)
            ? { value: selectedValue, label: selectedValue }
            : null;
          return (
            <Select
              options={genericOptions}
              value={current}
              onChange={handleGenericChange}
              styles={customSelectStyles}
              classNamePrefix="react-select"
              required={isRequired}
              placeholder="Select…"
              {...PORTAL_PROPS}
            />
          );
        }

        case "checkbox": {
          const values = asStringArray(field as ArrayFieldValue);
          return (
            <div className="flex flex-col gap-2.5">
              {option.map((opt) => {
                const checked = values.includes(opt);
                return (
                  <label
                    key={opt}
                    className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 transition hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) => {
                        const newVals = e.target.checked
                          ? [...values, opt]
                          : values.filter((v) => v !== opt);
                        handleAttributeChange(code, newVals);
                      }}
                      required={
                        isRequired && option.length > 0
                          ? values.length === 0
                          : false
                      }
                    />
                    <div
                      className={`flex h-4.5 w-4.5 flex-none items-center justify-center rounded border transition-colors ${
                        checked ? CHECK_BG : CHECK_BORDER
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {checked && (
                        <svg
                          className="h-3 w-3 text-primary-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-foreground">{opt}</span>
                  </label>
                );
              })}
            </div>
          );
        }

        case "boolean": {
          const value = !!field;
          return (
            <label className="inline-flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={value}
                  onChange={(e) =>
                    handleAttributeChange(code, e.target.checked)
                  }
                  required={isRequired}
                />
                <div
                  className={`h-6 w-11 rounded-full transition-colors ${
                    value ? "bg-primary" : "bg-input"
                  }`}
                />
                <div
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full border border-border bg-background shadow-sm transition-transform ${
                    value ? "translate-x-5" : ""
                  }`}
                />
              </div>
              <span className="text-sm text-foreground">
                {value ? "Yes" : "No"}
              </span>
            </label>
          );
        }

        case "radio": {
          const value = asString(field as StringFieldValue);
          return (
            <div className="flex flex-col gap-2.5">
              {option.map((opt) => {
                const checked = value === opt;
                return (
                  <label
                    key={opt}
                    className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 transition hover:bg-muted"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      value={opt}
                      checked={checked}
                      onChange={() => handleAttributeChange(code, opt)}
                      required={isRequired}
                    />
                    <div
                      className={`flex flex-none items-center justify-center rounded-full border transition-colors ${
                        checked ? "border-primary" : CHECK_BORDER
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {checked && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{opt}</span>
                  </label>
                );
              })}
            </div>
          );
        }

        case "date":
          return (
            <input
              title="date"
              type="date"
              className={INPUT_CLASS}
              value={asString(field as StringFieldValue)}
              onChange={(e) => handleAttributeChange(code, e.target.value)}
              required={isRequired}
            />
          );

        case "color":
          return (
            <div className="flex items-center gap-3">
              <input
                title="color"
                type="color"
                className="h-9 w-9 cursor-pointer rounded-lg border border-input bg-background p-0.5"
                value={asString(field as StringFieldValue) || "#000000"}
                onChange={(e) => handleAttributeChange(code, e.target.value)}
                required={isRequired}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {asString(field as StringFieldValue) || "#000000"}
              </span>
            </div>
          );

        case "url":
          return (
            <input
              title="url"
              type="url"
              className={INPUT_CLASS}
              value={asString(field as StringFieldValue)}
              onChange={(e) => handleAttributeChange(code, e.target.value)}
              placeholder="https://…"
              required={isRequired}
            />
          );

        case "multi-select":
          return (
            <Select
              isMulti
              options={genericOptions}
              value={selectedMultiValues}
              onChange={(opts) =>
                handleAttributeChange(
                  code,
                  (opts as MultiValue<any>).map((o) => o.value),
                )
              }
              styles={customSelectStyles}
              classNamePrefix="react-select"
              required={isRequired}
              placeholder="Select…"
              {...PORTAL_PROPS}
            />
          );

        default:
          return (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              Unsupported field type:{" "}
              <code className="font-mono">{type ?? "(none)"}</code>
            </div>
          );
      }
    };

    return (
      <div className="mb-5">
        <label className={LABEL_CLASS} htmlFor={`field-${code}`}>
          {name}
          {isRequired && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        <div>{renderField()}</div>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);

Fields.displayName = "Fields";

export default Fields;
