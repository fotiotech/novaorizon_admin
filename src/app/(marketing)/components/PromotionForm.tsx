// components/DynamicPromotionForm.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// --- Types ---
interface PropertyDefinition {
  _id: string;
  code: string;
  name: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "multi-select"
    | "checkbox"
    | "radio"
    | "boolean"
    | "date"
    | "color"
    | "file"
    | "url";
  isRequired: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  defaultValue?: any;
}

interface PromotionType {
  _id: string;
  name: string;
  code: string;
  calculationType: string;
  properties: PropertyDefinition[];
}

interface BaseFormValues {
  promotionTypeId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority: number;
  customerEligibility: {
    allCustomers: boolean;
    customerGroupIds: string[];
    minOrderAmount: number;
  };
  usageLimits: {
    totalUses: number | null;
    perCustomer: number | null;
    perOrder: number;
  };
  stackable: boolean;
  exclusiveWith: string[];
  propertyValues: Record<string, any>;
}

interface DynamicPromotionFormProps {
  promotionTypes: PromotionType[];
  initialValues?: Partial<BaseFormValues>;
  onSubmit: (data: any) => Promise<any>;
  customerGroups?: { label: string; value: string }[];
  otherPromotions?: { label: string; value: string }[];
}

const baseSchema = z.object({
  promotionTypeId: z.string().min(1, "Promotion type is required"),
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  customerEligibility: z.object({
    allCustomers: z.boolean().default(true),
    customerGroupIds: z.array(z.string()).default([]),
    minOrderAmount: z.number().default(0),
  }),
  usageLimits: z.object({
    totalUses: z.number().nullable().default(null),
    perCustomer: z.number().nullable().default(null),
    perOrder: z.number().default(1),
  }),
  stackable: z.boolean().default(false),
  exclusiveWith: z.array(z.string()).default([]),
  propertyValues: z.record(z.string(), z.any()).default({}),
});

type FormValues = z.infer<typeof baseSchema>;

// ─── Shared visual tokens ────────────────────────────────────────────
const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60";
const errorCls = "mt-1.5 text-[13px] text-destructive";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";

export function DynamicPromotionForm({
  promotionTypes,
  initialValues,
  onSubmit,
  customerGroups = [],
  otherPromotions = [],
}: DynamicPromotionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    initialValues?.promotionTypeId || "",
  );

  const {
    control,
    handleSubmit,
    register,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema) as any,
    defaultValues: {
      promotionTypeId: initialValues?.promotionTypeId || "",
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      startDate: initialValues?.startDate
        ? new Date(initialValues.startDate).toISOString().slice(0, 16)
        : "",
      endDate: initialValues?.endDate
        ? new Date(initialValues.endDate).toISOString().slice(0, 16)
        : "",
      isActive: initialValues?.isActive ?? true,
      priority: initialValues?.priority || 0,
      customerEligibility: {
        allCustomers: initialValues?.customerEligibility?.allCustomers ?? true,
        customerGroupIds:
          initialValues?.customerEligibility?.customerGroupIds || [],
        minOrderAmount: initialValues?.customerEligibility?.minOrderAmount || 0,
      },
      usageLimits: {
        totalUses: initialValues?.usageLimits?.totalUses ?? null,
        perCustomer: initialValues?.usageLimits?.perCustomer ?? null,
        perOrder: initialValues?.usageLimits?.perOrder ?? 1,
      },
      stackable: initialValues?.stackable || false,
      exclusiveWith: initialValues?.exclusiveWith || [],
      propertyValues: initialValues?.propertyValues || {},
    },
  });

  const selectedType = useMemo(
    () => promotionTypes.find((t) => t._id === selectedTypeId),
    [promotionTypes, selectedTypeId],
  );
  const allCustomers = watch("customerEligibility.allCustomers");

  useEffect(() => {
    if (!selectedType) return;
    const current = getValues("propertyValues") || {};
    const next: Record<string, any> = {};
    for (const prop of selectedType.properties) {
      next[prop.code] =
        current[prop.code] !== undefined
          ? current[prop.code]
          : (prop.defaultValue ?? "");
    }
    setValue("propertyValues", next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeId]);

  const validateProperty = (
    prop: PropertyDefinition,
    value: any,
  ): string | true => {
    if (prop.isRequired) {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return `${prop.name} is required`;
      }
      if (typeof value === "number" && isNaN(value)) {
        return `${prop.name} is required`;
      }
    }
    if (prop.type === "number") {
      const num = Number(value);
      if (!isNaN(num)) {
        if (prop.validation?.min !== undefined && num < prop.validation.min) {
          return `Minimum value is ${prop.validation.min}`;
        }
        if (prop.validation?.max !== undefined && num > prop.validation.max) {
          return `Maximum value is ${prop.validation.max}`;
        }
      }
    }
    if (
      prop.type === "text" ||
      prop.type === "textarea" ||
      prop.type === "url"
    ) {
      if (typeof value === "string") {
        if (
          prop.validation?.minLength &&
          value.length < prop.validation.minLength
        ) {
          return `Minimum length is ${prop.validation.minLength}`;
        }
        if (
          prop.validation?.maxLength &&
          value.length > prop.validation.maxLength
        ) {
          return `Maximum length is ${prop.validation.maxLength}`;
        }
        if (
          prop.validation?.pattern &&
          !new RegExp(prop.validation.pattern).test(value)
        ) {
          return "Invalid format";
        }
      }
    }
    return true;
  };

  const onFormSubmit = async (data: FormValues) => {
    clearErrors();

    if (selectedType) {
      let hasError = false;
      for (const prop of selectedType.properties) {
        const value = data.propertyValues?.[prop.code];
        const result = validateProperty(prop, value);
        if (result !== true) {
          setError(`propertyValues.${prop.code}` as any, {
            type: "manual",
            message: result,
          });
          hasError = true;
        }
      }
      if (hasError) {
        setSubmitError("Please fix the highlighted fields.");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };
      await onSubmit(payload);
      router.push("/marketing/promotions");
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPropertyField = (prop: PropertyDefinition) => {
    const fieldName = `propertyValues.${prop.code}` as const;
    const error = (errors.propertyValues as any)?.[prop.code]?.message;

    return (
      <div key={prop._id}>
        <label className={labelCls}>
          {prop.name}
          {prop.isRequired && <span className="ml-1 text-destructive">*</span>}
        </label>
        <Controller
          name={fieldName}
          control={control}
          rules={{
            required: prop.isRequired ? `${prop.name} is required` : false,
            ...(prop.type === "number" && {
              min: prop.validation?.min,
              max: prop.validation?.max,
              valueAsNumber: true,
            }),
            ...((prop.type === "text" ||
              prop.type === "textarea" ||
              prop.type === "url") && {
              minLength: prop.validation?.minLength,
              maxLength: prop.validation?.maxLength,
              pattern: prop.validation?.pattern
                ? new RegExp(prop.validation.pattern)
                : undefined,
            }),
          }}
          render={({ field }) => {
            const { onChange, onBlur, value, ref } = field;

            switch (prop.type) {
              case "text":
              case "url":
                return (
                  <input
                    ref={ref}
                    type={prop.type === "url" ? "url" : "text"}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={inputCls}
                  />
                );
              case "textarea":
                return (
                  <textarea
                    ref={ref}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    rows={3}
                    className={`${inputCls} resize-y`}
                  />
                );
              case "number":
                return (
                  <input
                    ref={ref}
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.valueAsNumber)}
                    onBlur={onBlur}
                    className={inputCls}
                  />
                );
              case "select":
                return (
                  <select
                    ref={ref}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={inputCls}
                  >
                    <option value="">Select…</option>
                    {prop.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                );
              case "multi-select":
                return (
                  <select
                    ref={ref}
                    multiple
                    value={Array.isArray(value) ? value : []}
                    onChange={(e) => {
                      const opts = e.target.options;
                      const selected = Array.from(opts)
                        .filter((o) => o.selected)
                        .map((o) => o.value);
                      onChange(selected);
                    }}
                    onBlur={onBlur}
                    className={`${inputCls} h-auto`}
                    size={4}
                  >
                    {prop.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                );
              case "checkbox":
                return (
                  <div className="space-y-2 pt-1">
                    {prop.options?.map((opt) => (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={Array.isArray(value) && value.includes(opt)}
                          onChange={(e) => {
                            const current = Array.isArray(value) ? value : [];
                            if (e.target.checked) onChange([...current, opt]);
                            else
                              onChange(
                                current.filter((v: string) => v !== opt),
                              );
                          }}
                          onBlur={onBlur}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                );
              case "radio":
                return (
                  <div className="space-y-2 pt-1">
                    {prop.options?.map((opt) => (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground"
                      >
                        <input
                          type="radio"
                          value={opt}
                          checked={value === opt}
                          onChange={() => onChange(opt)}
                          onBlur={onBlur}
                          className="h-4 w-4 border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                );
              case "boolean":
                return (
                  <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-[14px] text-foreground">
                    <input
                      ref={ref}
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => onChange(e.target.checked)}
                      onBlur={onBlur}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    Enabled
                  </label>
                );
              case "date":
                return (
                  <input
                    ref={ref}
                    type="datetime-local"
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={inputCls}
                  />
                );
              case "color":
                return (
                  <div className="flex items-center gap-3">
                    <input
                      ref={ref}
                      type="color"
                      value={value || "#000000"}
                      onChange={onChange}
                      onBlur={onBlur}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
                    />
                    <span className="text-[13px] text-muted-foreground">
                      {value || "#000000"}
                    </span>
                  </div>
                );
              case "file":
                return (
                  <input
                    ref={ref}
                    type="file"
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                    onBlur={onBlur}
                    className="block w-full text-[14px] text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3.5 file:py-2 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-muted/80"
                  />
                );
              default:
                return (
                  <input
                    ref={ref}
                    type="text"
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={inputCls}
                  />
                );
            }
          }}
        />
        {error && <p className={errorCls}>{error}</p>}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit as any)}
      className="mx-auto w-full max-w-3xl space-y-6 pb-24"
    >
      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
          {submitError}
        </div>
      )}

      {/* ── Type ─────────────────────────────────────────────── */}
      <div className={fieldsetCls}>
        <div>
          <label className={labelCls}>
            Promotion type <span className="text-destructive">*</span>
          </label>
          <select
            {...register("promotionTypeId")}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a promotion type…</option>
            {promotionTypes.map((type) => (
              <option key={type._id} value={type._id}>
                {type.name} · {type.calculationType.replace("_", " ")}
              </option>
            ))}
          </select>
          {errors.promotionTypeId && (
            <p className={errorCls}>{errors.promotionTypeId.message}</p>
          )}
        </div>

        {selectedType && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/5 px-3.5 py-2.5 text-[13px]">
            <span className="font-medium text-foreground">
              {selectedType.name}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="capitalize text-muted-foreground">
              {selectedType.calculationType.replace("_", " ")}
            </span>
          </div>
        )}
      </div>

      {selectedType && (
        <>
          {/* ── Dynamic properties ─────────────────────────────── */}
          {selectedType.properties.length > 0 && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Properties</legend>
              <div className="space-y-5">
                {selectedType.properties.map((prop) =>
                  renderPropertyField(prop),
                )}
              </div>
            </fieldset>
          )}

          {/* ── Basic details ──────────────────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Details</legend>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Name <span className="text-destructive">*</span>
                </label>
                <input {...register("name")} className={inputCls} />
                {errors.name && (
                  <p className={errorCls}>{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <input
                  type="number"
                  {...register("priority", { valueAsNumber: true })}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                {...register("description")}
                rows={3}
                className={`${inputCls} resize-y`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>
                  Start date <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  {...register("startDate")}
                  className={inputCls}
                />
                {errors.startDate && (
                  <p className={errorCls}>{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>
                  End date <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  {...register("endDate")}
                  className={inputCls}
                />
                {errors.endDate && (
                  <p className={errorCls}>{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
              <input
                type="checkbox"
                {...register("isActive")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              Active
            </label>
          </fieldset>

          {/* ── Eligibility ────────────────────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Customer eligibility</legend>

            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
              <input
                type="checkbox"
                {...register("customerEligibility.allCustomers")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              All customers
            </label>

            {!allCustomers && (
              <div>
                <label className={labelCls}>Customer groups</label>
                <select
                  multiple
                  {...register("customerEligibility.customerGroupIds")}
                  className={`${inputCls} h-auto`}
                  size={3}
                >
                  {customerGroups.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <p className={helperCls}>Hold Ctrl/Cmd to select multiple.</p>
              </div>
            )}

            <div>
              <label className={labelCls}>Minimum order amount</label>
              <input
                type="number"
                step="0.01"
                {...register("customerEligibility.minOrderAmount", {
                  valueAsNumber: true,
                })}
                className={inputCls}
              />
            </div>
          </fieldset>

          {/* ── Usage limits ───────────────────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Usage limits</legend>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Total uses</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  {...register("usageLimits.totalUses", {
                    valueAsNumber: true,
                  })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Per customer</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  {...register("usageLimits.perCustomer", {
                    valueAsNumber: true,
                  })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Per order</label>
                <input
                  type="number"
                  {...register("usageLimits.perOrder", {
                    valueAsNumber: true,
                  })}
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* ── Stacking ───────────────────────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Stacking</legend>

            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
              <input
                type="checkbox"
                {...register("stackable")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              Stackable with other promotions
            </label>

            <div>
              <label className={labelCls}>Exclusive with</label>
              <select
                multiple
                {...register("exclusiveWith")}
                className={`${inputCls} h-auto`}
                size={3}
              >
                {otherPromotions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className={helperCls}>
                Cannot be combined with the selected promotions.
              </p>
            </div>
          </fieldset>
        </>
      )}

      {/* ── Sticky action bar ────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-[14px] font-medium text-foreground transition hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save promotion"}
        </button>
      </div>
    </form>
  );
}
