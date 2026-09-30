// components/PromotionComposer.tsx
"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  CALC_FIELDS,
  CALC_LABELS,
  type CalcFieldDef,
} from "@/app/lib/validation/calc-fields";
import { ProductPicker, type ProductOption } from "./ProductPicker";
import { EntityPicker, type EntityOption } from "./EntityPicker";

// ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  code: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  calculationType: z.enum([
    "percentage",
    "fixed_amount",
    "buy_x_get_y",
    "free_shipping",
    "bundle_discount",
  ]),
  propertyValues: z.record(z.string(), z.any()).default({}),
  scope: z
    .object({
      appliesTo: z.enum(["all", "products", "categories", "brands"]),
      productIds: z.array(z.string()),
      categoryIds: z.array(z.string()),
      brandIds: z.array(z.string()),
      excludeProductIds: z.array(z.string()),
    })
    .default({
      appliesTo: "all",
      productIds: [],
      categoryIds: [],
      brandIds: [],
      excludeProductIds: [],
    }),
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
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initialValues?: Partial<FormValues>;
  customerGroups?: { label: string; value: string }[];
  otherPromotions?: { label: string; value: string }[];
  products?: ProductOption[];
  categories?: EntityOption[];
  brands?: EntityOption[];
  onSubmit: (data: FormValues) => Promise<any>;
}

// ─────────────────────────────────────────────────────────────────────
const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const errorCls = "mt-1.5 text-[13px] text-destructive";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";

const SCOPE_OPTIONS: {
  value: "all" | "products" | "categories" | "brands";
  label: string;
  hint: string;
}[] = [
  {
    value: "all",
    label: "All products",
    hint: "Applies to every product in the catalog.",
  },
  {
    value: "products",
    label: "Specific products",
    hint: "Pick individual products.",
  },
  {
    value: "categories",
    label: "Specific categories",
    hint: "All products within the selected categories.",
  },
  {
    value: "brands",
    label: "Specific brands",
    hint: "All products from the selected brands.",
  },
];

export function PromotionComposer({
  initialValues,
  customerGroups = [],
  otherPromotions = [],
  products = [],
  categories = [],
  brands = [],
  onSubmit,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "",
      code: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      priority: 0,
      calculationType: "percentage",
      propertyValues: {},
      scope: {
        appliesTo: "all",
        productIds: [],
        categoryIds: [],
        brandIds: [],
        excludeProductIds: [],
      },
      customerEligibility: {
        allCustomers: true,
        customerGroupIds: [],
        minOrderAmount: 0,
      },
      usageLimits: { totalUses: null, perCustomer: null, perOrder: 1 },
      stackable: false,
      exclusiveWith: [],
      ...initialValues,
    },
  });

  const calcType = watch("calculationType");
  const allCustomers = watch("customerEligibility.allCustomers");
  const scopeAppliesTo = watch("scope.appliesTo");

  // Bundle promotions own their product list, so hide the scope picker.
  const showScope = calcType !== "bundle_discount";

  const activeFields: CalcFieldDef[] = useMemo(() => {
    const defs = CALC_FIELDS[calcType] ?? [];
    return defs.map((d) =>
      d.productPicker ? { ...d, options: products.map((p) => p.value) } : d,
    );
  }, [calcType, products]);

  const handleCalcTypeChange = (next: string) => {
    if (next === calcType) return;
    const defaults: Record<string, any> = {};
    for (const f of CALC_FIELDS[next] ?? []) {
      if (f.defaultValue !== undefined) defaults[f.code] = f.defaultValue;
    }
    setValue("calculationType", next as any, { shouldDirty: true });
    setValue("propertyValues", defaults, { shouldDirty: true });
  };

  const handleScopeChange = (
    next: "all" | "products" | "categories" | "brands",
  ) => {
    if (next === scopeAppliesTo) return;
    setValue("scope.appliesTo", next, { shouldDirty: true });
    // Clear the arrays that are no longer relevant so hidden selections
    // don't leak into the submitted payload.
    if (next !== "products") {
      setValue("scope.productIds", [], { shouldDirty: true });
    }
    if (next !== "categories") {
      setValue("scope.categoryIds", [], { shouldDirty: true });
    }
    if (next !== "brands") {
      setValue("scope.brandIds", [], { shouldDirty: true });
    }
  };

  const handleSubmitForm = async (data: FormValues) => {
    // Calc-field required checks
    const missing: string[] = [];
    for (const f of activeFields) {
      const v = data.propertyValues?.[f.code];
      const empty =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (f.isRequired && empty) missing.push(f.name);
    }
    if (missing.length > 0) {
      setSubmitError(`Missing required field(s): ${missing.join(", ")}`);
      return;
    }

    // Scope required checks (skipped for bundles — they carry their own).
    if (showScope) {
      const s = data.scope;
      if (s?.appliesTo === "products" && s.productIds.length === 0) {
        setSubmitError("Select at least one product for this promotion.");
        return;
      }
      if (s?.appliesTo === "categories" && s.categoryIds.length === 0) {
        setSubmitError("Select at least one category for this promotion.");
        return;
      }
      if (s?.appliesTo === "brands" && s.brandIds.length === 0) {
        setSubmitError("Select at least one brand for this promotion.");
        return;
      }
    }

    if (data.endDate <= data.startDate) {
      setSubmitError("End date must be after start date.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(data);
      router.push("/marketing/promotions");
    } catch (err: any) {
      setSubmitError(err?.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCalcField = (def: CalcFieldDef) => {
    const field = `propertyValues.${def.code}` as const;
    return (
      <div key={def.code}>
        <label className={labelCls}>
          {def.name}
          {def.isRequired && <span className="ml-1 text-destructive">*</span>}
        </label>
        <Controller
          name={field}
          control={control}
          render={({ field: f }) => {
            switch (def.type) {
              case "number":
                return (
                  <input
                    type="number"
                    value={f.value ?? ""}
                    onChange={(e) =>
                      f.onChange(
                        e.target.value === "" ? "" : e.target.valueAsNumber,
                      )
                    }
                    onBlur={f.onBlur}
                    min={def.validation?.min}
                    max={def.validation?.max}
                    className={inputCls}
                  />
                );
              case "boolean":
                return (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
                    <input
                      type="checkbox"
                      checked={!!f.value}
                      onChange={(e) => f.onChange(e.target.checked)}
                      onBlur={f.onBlur}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    Enabled
                  </label>
                );
              case "select":
                return (
                  <select {...f} value={f.value ?? ""} className={inputCls}>
                    <option value="">Select…</option>
                    {def.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                );
              case "multi-select":
                if (def.productPicker) {
                  return (
                    <ProductPicker
                      value={Array.isArray(f.value) ? f.value : []}
                      onChange={(next) => f.onChange(next)}
                      options={products}
                      placeholder="Search products…"
                      emptyMessage="No products match your search."
                    />
                  );
                }
                return (
                  <select
                    multiple
                    value={Array.isArray(f.value) ? f.value : []}
                    onChange={(e) =>
                      f.onChange(
                        Array.from(e.target.options)
                          .filter((o) => o.selected)
                          .map((o) => o.value),
                      )
                    }
                    onBlur={f.onBlur}
                    size={Math.min(6, Math.max(3, def.options?.length ?? 3))}
                    className={`${inputCls} h-auto`}
                  >
                    {def.options?.map((o) => (
                      <option key={o} value={o}>
                        {products.find((p) => p.value === o)?.label ?? o}
                      </option>
                    ))}
                  </select>
                );
              case "textarea":
                return (
                  <textarea
                    {...f}
                    value={f.value ?? ""}
                    rows={3}
                    className={`${inputCls} resize-y`}
                  />
                );
              case "date":
                return (
                  <input
                    type="datetime-local"
                    {...f}
                    value={f.value ?? ""}
                    className={inputCls}
                  />
                );
              default:
                return (
                  <input {...f} value={f.value ?? ""} className={inputCls} />
                );
            }
          }}
        />
        {def.helpText && <p className={helperCls}>{def.helpText}</p>}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit(handleSubmitForm)}
      className="mx-auto w-full max-w-3xl space-y-6 pb-24"
    >
      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
          {submitError}
        </div>
      )}

      {/* Details */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Promotion details</legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Name <span className="text-destructive">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g., Summer sale 10% off"
              className={inputCls}
            />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
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
          <label className={labelCls}>Code</label>
          <input
            {...register("code")}
            placeholder="e.g., SUMMER10"
            className={`${inputCls} font-mono uppercase tracking-wide`}
          />
          <p className={helperCls}>
            Optional. When set, customers must type this to redeem.
          </p>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            {...register("description")}
            rows={2}
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>
              Start <span className="text-destructive">*</span>
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
              End <span className="text-destructive">*</span>
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

      {/* Calculation */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Calculation</legend>

        <div>
          <label className={labelCls}>
            Discount type <span className="text-destructive">*</span>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(CALC_LABELS).map(([value, label]) => {
              const selected = calcType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleCalcTypeChange(value)}
                  className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-[14px] transition ${
                    selected
                      ? "border-primary/50 bg-primary/5 text-foreground"
                      : "border-border bg-background text-foreground/80 hover:bg-muted/40"
                  }`}
                >
                  <span>{label}</span>
                  {selected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
          <input type="hidden" {...register("calculationType")} />
        </div>

        {activeFields.length > 0 ? (
          <div className="space-y-4 border-t border-border pt-4">
            {activeFields.map(renderCalcField)}
          </div>
        ) : (
          <p className={helperCls}>
            This discount type takes no additional configuration.
          </p>
        )}
      </fieldset>

      {/* Scope — what the promotion applies to */}
      {showScope && (
        <fieldset className={fieldsetCls}>
          <legend className={legendCls}>Applies to</legend>

          <div className="grid gap-2 sm:grid-cols-2">
            {SCOPE_OPTIONS.map((opt) => {
              const selected = scopeAppliesTo === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleScopeChange(opt.value)}
                  className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition ${
                    selected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-medium text-foreground">
                      {opt.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {opt.hint}
                    </span>
                  </span>
                  {selected && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <input type="hidden" {...register("scope.appliesTo")} />

          {scopeAppliesTo === "products" && (
            <div>
              <label className={labelCls}>
                Products <span className="text-destructive">*</span>
              </label>
              <Controller
                name="scope.productIds"
                control={control}
                render={({ field: f }) => (
                  <ProductPicker
                    value={Array.isArray(f.value) ? f.value : []}
                    onChange={(next) => f.onChange(next)}
                    options={products}
                    placeholder="Search products…"
                    emptyMessage="No products match your search."
                  />
                )}
              />
              <p className={helperCls}>
                The promotion only applies to the selected products.
              </p>
            </div>
          )}

          {scopeAppliesTo === "categories" && (
            <div>
              <label className={labelCls}>
                Categories <span className="text-destructive">*</span>
              </label>
              <Controller
                name="scope.categoryIds"
                control={control}
                render={({ field: f }) => (
                  <EntityPicker
                    value={Array.isArray(f.value) ? f.value : []}
                    onChange={(next) => f.onChange(next)}
                    options={categories}
                    placeholder="Search categories…"
                    emptyMessage="No categories match your search."
                  />
                )}
              />
              <p className={helperCls}>
                The promotion applies to every product in the selected
                categories.
              </p>
            </div>
          )}

          {scopeAppliesTo === "brands" && (
            <div>
              <label className={labelCls}>
                Brands <span className="text-destructive">*</span>
              </label>
              <Controller
                name="scope.brandIds"
                control={control}
                render={({ field: f }) => (
                  <EntityPicker
                    value={Array.isArray(f.value) ? f.value : []}
                    onChange={(next) => f.onChange(next)}
                    options={brands}
                    placeholder="Search brands…"
                    emptyMessage="No brands match your search."
                  />
                )}
              />
              <p className={helperCls}>
                The promotion applies to every product from the selected brands.
              </p>
            </div>
          )}
        </fieldset>
      )}

      {/* Eligibility */}
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

      {/* Limits */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Usage limits</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Total uses</label>
            <input
              type="number"
              placeholder="Unlimited"
              {...register("usageLimits.totalUses", { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Per customer</label>
            <input
              type="number"
              placeholder="Unlimited"
              {...register("usageLimits.perCustomer", { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Per order</label>
            <input
              type="number"
              {...register("usageLimits.perOrder", { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
        </div>
      </fieldset>

      {/* Stacking */}
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
