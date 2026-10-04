// app/(catalog)/catalog/products/component/Fields.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import Select, { MultiValue } from "react-select";
import FilesUploader from "../../../../../components/FilesUploader";
import { getBrands } from "@/app/actions/brand";
import { getCarriers } from "@/app/actions/carrier";
import { Brand } from "@/constant/types";
import RichTextEditorWrapper from "./RichTextEditorWrapper";
import { BottomSheet } from "@/components/ux/DescBottomSheet";
import { useFileUploader } from "@/hooks/useFileUploader";

interface Carrier {
  _id: string;
  name: string;
}

// ------------------------------------------------------------------
// Field value shapes
// ------------------------------------------------------------------
type UnitValue = { value: number | ""; unit?: string };
type NumberFieldValue = number | "" | UnitValue | null | undefined;
type StringFieldValue = string | null | undefined;
type ArrayFieldValue = string[] | null | undefined;

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

/** Used to decide whether a floating label should sit "up". */
const hasDisplayValue = (v: unknown): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number" || typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") {
    if (isUnitValue(v)) {
      return v.value !== "" && v.value !== undefined && v.value !== null;
    }
    return Object.keys(v).length > 0;
  }
  return false;
};

// ------------------------------------------------------------------
// useIsMobile
// ------------------------------------------------------------------
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
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
// Style tokens
// ------------------------------------------------------------------
// Plain label used for fields that don't float (checkbox, radio, boolean, …)
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-muted-foreground";

// The input — compact, matching the Facebook Ads form fields.
const FIELD_INPUT_CLASS = [
  "peer w-full rounded-lg border border-input bg-background",
  "px-3 py-2 text-sm leading-5 text-foreground",
  "outline-none transition placeholder:text-transparent",
  "focus:border-ring focus:ring-1 focus:ring-ring/30",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

// Floating label — sits ON the top border when floated up, centered when down.
// A small horizontal padding + background chip hides the border line behind it.
const FLOATING_LABEL_BASE =
  "pointer-events-none absolute left-2 z-10 select-none rounded bg-background px-1 transition-all duration-150";
const FLOATING_LABEL_UP =
  "top-0 -translate-y-1/2 text-[10px] font-medium leading-4 text-muted-foreground";
const FLOATING_LABEL_DOWN =
  "top-1/2 -translate-y-1/2 text-sm leading-5 text-muted-foreground";
// `peer-focus` wins over the static positioning classes because it carries
// a pseudo-class (higher specificity). Keep both transforms in sync so the
// label slides up cleanly on focus.
const FLOATING_LABEL_PEER_FOCUS =
  "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:font-medium peer-focus:leading-4";

const FloatingLabel: React.FC<{
  htmlFor?: string;
  floated: boolean;
  required?: boolean;
  children: React.ReactNode;
}> = ({ htmlFor, floated, required, children }) => (
  <label
    htmlFor={htmlFor}
    className={`${FLOATING_LABEL_BASE} ${
      floated ? FLOATING_LABEL_UP : FLOATING_LABEL_DOWN
    } ${FLOATING_LABEL_PEER_FOCUS}`}
  >
    {children}
    {required && <span className="ml-0.5 text-destructive">*</span>}
  </label>
);
FloatingLabel.displayName = "FloatingLabel";

const CHECK_BORDER = "border-input";
const CHECK_BG = "bg-primary border-primary";

// Border color used inside react-select's JS style objects — matches
// `border-input` from the surrounding form.
const RS_BORDER = "hsl(var(--input))";
const RS_BORDER_FOCUS = "hsl(var(--ring))";

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? RS_BORDER_FOCUS : RS_BORDER,
    borderWidth: "1px",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px hsl(var(--ring) / 0.3)" : "none",
    minHeight: "42px",
    fontSize: "0.875rem",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    border: `1px solid ${RS_BORDER}`,
    borderRadius: "0.5rem",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  }),
  menuPortal: (provided: any) => ({ ...provided, zIndex: 9999 }),
  menuList: (provided: any) => ({ ...provided, padding: 4 }),
  option: (provided: any, state: any) => ({
    ...provided,
    fontSize: "0.875rem",
    padding: "7px 12px",
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
  placeholder: (p: any) => ({ ...p, color: "transparent" }),
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
    backgroundColor: RS_BORDER,
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
};

/**
 * Because the floating label now sits on the top border (not inside the
 * input), the value-container padding doesn't need to change when floated.
 * We keep the helper so callers don't have to change, but it returns the
 * same padding in both states.
 */
const selectStyles = (_floated: boolean) => ({
  ...customSelectStyles,
  valueContainer: (p: any) => ({
    ...p,
    padding: "6px 12px",
  }),
});

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
// Description field
// ------------------------------------------------------------------
const DescriptionField: React.FC<{
  field: unknown;
  code: string;
  name?: string;
  productId: string;
  handleAttributeChange: (code: string, value: any) => void;
  isRequired?: boolean;
}> = ({ field, code, name, productId, handleAttributeChange }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const value = asString(field);

  if (isMobile) {
    const previewText = value
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return (
      <>
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-left text-sm transition hover:bg-muted/40 focus:border-ring focus:outline-none"
        >
          {previewText ? (
            <span className="line-clamp-3 text-foreground">{previewText}</span>
          ) : (
            <span className="text-muted-foreground/70">
              Tap to edit {name || "description"}
            </span>
          )}
        </button>

        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title={name || "Description"}
          height="85vh"
        >
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="min-h-0 flex-1">
              <RichTextEditorWrapper
                value={value}
                onChange={(html: any) => handleAttributeChange(code, html)}
                placeholder={`Enter ${name}`}
                productId={productId}
                fillContainer
              />
            </div>
            <div className="flex flex-none justify-end">
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </BottomSheet>
      </>
    );
  }

  return (
    <RichTextEditorWrapper
      value={value}
      onChange={(html: any) => handleAttributeChange(code, html)}
      placeholder={`Enter ${name}`}
      productId={productId}
      contentMaxHeight={500}
    />
  );
};
DescriptionField.displayName = "DescriptionField";

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
    const [selectFocused, setSelectFocused] = useState(false);

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

    // Which field types render their own floating label inside the shell?
    const hasFloatingLabel =
      type === "text" ||
      type === "number" ||
      type === "url" ||
      type === "date" ||
      type === "select" ||
      type === "multi-select" ||
      (type === "textarea" && code !== "description");

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
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              File field <code className="font-mono">{code}</code> has no
              uploader configured.
            </div>
          );

        case "text":
          return (
            <div className="relative">
              <input
                id={`field-${code}`}
                type="text"
                className={FIELD_INPUT_CLASS}
                value={asString(field as StringFieldValue)}
                placeholder=" "
                onChange={(e) => handleAttributeChange(code, e.target.value)}
                required={isRequired}
                aria-required={isRequired}
              />
              <FloatingLabel
                htmlFor={`field-${code}`}
                floated={hasDisplayValue(field)}
                required={isRequired}
              >
                {name}
              </FloatingLabel>
            </div>
          );

        case "textarea":
          if (code === "description") {
            return (
              <DescriptionField
                field={field}
                code={code}
                name={name}
                productId={productId || ""}
                handleAttributeChange={handleAttributeChange}
                isRequired={isRequired}
              />
            );
          }
          return (
            <div className="relative">
              <textarea
                id={`field-${code}`}
                className={`${FIELD_INPUT_CLASS} min-h-[96px] resize-y`}
                value={asString(field as StringFieldValue)}
                placeholder=" "
                onChange={(e) => handleAttributeChange(code, e.target.value)}
                required={isRequired}
                rows={4}
              />
              <FloatingLabel
                htmlFor={`field-${code}`}
                floated={hasDisplayValue(field)}
                required={isRequired}
              >
                {name}
              </FloatingLabel>
            </div>
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

          const numberField = (
            <>
              <input
                id={`field-${code}`}
                type="number"
                className={FIELD_INPUT_CLASS}
                value={asNumberInput(currentValue as NumberFieldValue)}
                placeholder=" "
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
              <FloatingLabel
                htmlFor={`field-${code}`}
                floated={hasDisplayValue(currentValue)}
                required={isRequired}
              >
                {name}
              </FloatingLabel>
            </>
          );

          if (familyUnits.length > 0) {
            const unitOptions = familyUnits.map((u) => ({
              value: u.symbol,
              label: u.symbol,
            }));
            return (
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">{numberField}</div>
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
                  className="w-32"
                  classNamePrefix="react-select"
                  placeholder="Unit"
                  isClearable={!isRequired}
                  styles={customSelectStyles}
                  {...PORTAL_PROPS}
                />
              </div>
            );
          }
          return <div className="relative">{numberField}</div>;
        }

        case "select": {
          if (code === "brand") {
            const selected =
              brandOptions.find((o) => o.value === selectedBrandId) ?? null;
            const floated = !!selected || selectFocused;
            return (
              <div className="relative">
                <Select
                  {...PORTAL_PROPS}
                  options={brandOptions}
                  value={selected}
                  onChange={handleBrandChange}
                  styles={selectStyles(floated)}
                  classNamePrefix="react-select"
                  placeholder=" "
                  isLoading={brands.length === 0 && !error}
                  onFocus={() => setSelectFocused(true)}
                  onBlur={() => setSelectFocused(false)}
                />
                <FloatingLabel floated={floated} required={isRequired}>
                  {name}
                </FloatingLabel>
              </div>
            );
          }
          if (code === "carrier") {
            const selected =
              carrierOptions.find((o) => o.value === rawCarrier) ?? null;
            const floated = !!selected || selectFocused;
            return (
              <div className="relative">
                <Select
                  {...PORTAL_PROPS}
                  options={carrierOptions}
                  value={selected}
                  onChange={handleCarrierChange}
                  styles={selectStyles(floated)}
                  classNamePrefix="react-select"
                  placeholder=" "
                  onFocus={() => setSelectFocused(true)}
                  onBlur={() => setSelectFocused(false)}
                />
                <FloatingLabel floated={floated} required={isRequired}>
                  {name}
                </FloatingLabel>
              </div>
            );
          }
          const selectedValue =
            asStringArray(field)[0] ?? asString(field as StringFieldValue);
          const current = option.includes(selectedValue)
            ? { value: selectedValue, label: selectedValue }
            : null;
          const floated = !!current || selectFocused;
          return (
            <div className="relative">
              <Select
                {...PORTAL_PROPS}
                options={genericOptions}
                value={current}
                onChange={handleGenericChange}
                styles={selectStyles(floated)}
                classNamePrefix="react-select"
                placeholder=" "
                onFocus={() => setSelectFocused(true)}
                onBlur={() => setSelectFocused(false)}
              />
              <FloatingLabel floated={floated} required={isRequired}>
                {name}
              </FloatingLabel>
            </div>
          );
        }

        case "checkbox": {
          const values = asStringArray(field as ArrayFieldValue);
          return (
            <div className="flex flex-col gap-2">
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
                      className={`flex flex-none items-center justify-center rounded border transition-colors ${
                        checked ? CHECK_BG : CHECK_BORDER
                      }`}
                      style={{ width: 20, height: 20 }}
                    >
                      {checked && (
                        <svg
                          className="h-3.5 w-3.5 text-primary-foreground"
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
                  className={`rounded-full transition-colors ${
                    value ? "bg-primary" : "bg-input"
                  }`}
                  style={{ width: 44, height: 24 }}
                />
                <div
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full border border-input bg-background transition-transform ${
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
            <div className="flex flex-col gap-2">
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
                      style={{ width: 20, height: 20 }}
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
            <div className="relative">
              <input
                id={`field-${code}`}
                title="date"
                type="date"
                className={FIELD_INPUT_CLASS}
                value={asString(field as StringFieldValue)}
                placeholder=" "
                onChange={(e) => handleAttributeChange(code, e.target.value)}
                required={isRequired}
              />
              <FloatingLabel
                htmlFor={`field-${code}`}
                floated={hasDisplayValue(field)}
                required={isRequired}
              >
                {name}
              </FloatingLabel>
            </div>
          );

        case "color":
          return (
            <div className="flex items-center gap-3">
              <input
                title="color"
                type="color"
                className="cursor-pointer rounded-lg border border-input bg-background p-1"
                style={{ width: 40, height: 40 }}
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
            <div className="relative">
              <input
                id={`field-${code}`}
                title="url"
                type="url"
                className={FIELD_INPUT_CLASS}
                value={asString(field as StringFieldValue)}
                placeholder=" "
                onChange={(e) => handleAttributeChange(code, e.target.value)}
                required={isRequired}
              />
              <FloatingLabel
                htmlFor={`field-${code}`}
                floated={hasDisplayValue(field)}
                required={isRequired}
              >
                {name}
              </FloatingLabel>
            </div>
          );

        case "multi-select": {
          const floated = selectedMultiValues.length > 0 || selectFocused;
          return (
            <div className="relative">
              <Select
                {...PORTAL_PROPS}
                isMulti
                options={genericOptions}
                value={selectedMultiValues}
                onChange={(opts) =>
                  handleAttributeChange(
                    code,
                    (opts as MultiValue<any>).map((o) => o.value),
                  )
                }
                styles={selectStyles(floated)}
                classNamePrefix="react-select"
                placeholder=" "
                onFocus={() => setSelectFocused(true)}
                onBlur={() => setSelectFocused(false)}
              />
              <FloatingLabel floated={floated} required={isRequired}>
                {name}
              </FloatingLabel>
            </div>
          );
        }

        default:
          return (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Unsupported field type:{" "}
              <code className="font-mono">{type ?? "(none)"}</code>
            </div>
          );
      }
    };

    return (
      <div className="mb-4">
        {!hasFloatingLabel && (
          <label className={LABEL_CLASS} htmlFor={`field-${code}`}>
            {name}
            {isRequired && <span className="ml-0.5 text-destructive">*</span>}
          </label>
        )}
        <div>{renderField()}</div>
        {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);

Fields.displayName = "Fields";

export default Fields;
