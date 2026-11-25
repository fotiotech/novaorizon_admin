// components/PromotionComposer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  CALC_FIELDS,
  CALC_LABELS,
  type CalcFieldDef,
} from "@/app/lib/validation/calc-fields";
import { ProductPicker, type ProductOption } from "./ProductPicker";
import { previewPromotionRules } from "@/lib/api/promotion";
import { PROMOTION_RULE_FIELDS } from "@/lib/promotion/rule-fields";
import { EntityPicker, type EntityOption } from "./EntityPicker";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";

// ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  code: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(), // NEW
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  offerId: z.string().optional(),
  calculationType: z
    .enum([
      "percentage",
      "fixed_amount",
      "buy_x_get_y",
      "free_shipping",
      "bundle_discount",
    ])
    .optional(),
  propertyValues: z.record(z.string(), z.any()).default({}),
  scope: z
    .object({
      appliesTo: z.enum([
        "all",
        "products",
        "categories",
        "brands",
        "rules",
      ]),
      match: z.enum(["all", "any"]).default("all"),
      rules: z
        .array(
          z.object({
            field: z.string(),
            operator: z.string(),
            value: z.any().optional(),
          }),
        )
        .default([]),
      productIds: z.array(z.string()),
      categoryIds: z.array(z.string()),
      brandIds: z.array(z.string()),
      excludeProductIds: z.array(z.string()),
    })
    .default({
      appliesTo: "all",
      match: "all",
      rules: [],
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
  id?: string; // NEW — pass the promotion _id in edit mode
  initialValues?: Partial<FormValues>;
  customerGroups?: { label: string; value: string }[];
  otherPromotions?: { label: string; value: string }[];
  products?: ProductOption[];
  categories?: EntityOption[];
  brands?: EntityOption[];
  offers?: { value: string; label: string; sublabel?: string }[];
  onSubmit: (data: FormValues) => Promise<any>;
}

// ─────────────────────────────────────────────────────────────────────
const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const errorCls = "mt-1.5 text-[13px] text-destructive";
const fieldsetCls = "rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";

const SCOPE_OPTIONS: {
  value: "all" | "products" | "categories" | "brands" | "rules";
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
  {
    value: "rules",
    label: "Rule-based",
    hint: "Match products dynamically from product / offer fields.",
  },
];

function RuleValueInput({
  control,
  index,
}: {
  control: any;
  index: number;
}) {
  const operator = useWatch({
    control,
    name: `scope.rules.${index}.operator`,
  });

  return (
    <Controller
      name={`scope.rules.${index}.value`}
      control={control}
      render={({ field }) => {
        if (operator === "$exists") {
          return (
            <select
              className={inputCls}
              value={field.value === true || field.value === "true" ? "true" : "false"}
              onChange={(e) => field.onChange(e.target.value === "true")}
            >
              <option value="true">Exists</option>
              <option value="false">Does not exist</option>
            </select>
          );
        }

        if (["$gt", "$gte", "$lt", "$lte"].includes(String(operator))) {
          return (
            <input
              type="number"
              className={inputCls}
              placeholder="number"
              value={field.value ?? ""}
              onChange={(e) =>
                field.onChange(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          );
        }

        return (
          <input
            className={inputCls}
            placeholder={
              ["$in", "$nin"].includes(String(operator))
                ? "comma-separated values"
                : "value"
            }
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
          />
        );
      }}
    />
  );
}

export function PromotionComposer({
  id,
  initialValues,
  customerGroups = [],
  otherPromotions = [],
  products = [],
  categories = [],
  brands = [],
  offers = [],
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
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "",
      code: "",
      description: "",
      imageUrl: "",
      startDate: "",
      endDate: "",
      isActive: true,
      priority: 0,
      offerId: "",
      calculationType: "percentage",
      propertyValues: {},
      scope: {
        appliesTo: "all",
        match: "all",
        rules: [],
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

  /* ------------------------------------------------------------------ */
  /*                        Image uploader wiring                        */
  /* ------------------------------------------------------------------ */

  const existingImageUrl = (initialValues?.imageUrl as string) || "";

  const {
    files,
    loading: fileLoading,
    addFiles,
    setFiles,
  } = useFileUploader(
    id,
    existingImageUrl ? [existingImageUrl] : [],
    "promotions",
  );

  // Keep RHF's imageUrl in sync with the uploader's files state. This runs
  // once on mount (files already matches initialValues) and whenever the
  // user uploads or removes an image.
  useEffect(() => {
    const url = files[0] || "";
    const current = (getValues("imageUrl") as string) || "";
    if (url !== current) {
      setValue("imageUrl", url, { shouldDirty: true });
    }
  }, [files, getValues, setValue]);

  const handleRemoveImage = async (index: number, _fileUrl: string) => {
    // Removing from local state is enough: the `useEffect` above syncs
    // `files` → RHF's `imageUrl`. On save, the empty string replaces the
    // stored URL in Mongo. The S3 object stays (see note below).
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ------------------------------------------------------------------ */
  /*                        Existing form logic                          */
  /* ------------------------------------------------------------------ */

  const calcType = watch("calculationType") ?? "percentage";
  const selectedOfferId = watch("offerId");
  const hasOffer = !!selectedOfferId;

  useEffect(() => {
    if (selectedOfferId) return;
    const first = offers[0];
    if (first) setValue("offerId", first.value, { shouldDirty: false });
  }, [offers, selectedOfferId, setValue]);
  const allCustomers = watch("customerEligibility.allCustomers");
  const scopeAppliesTo = watch("scope.appliesTo");

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
    next: "all" | "products" | "categories" | "brands" | "rules",
  ) => {
    if (next === scopeAppliesTo) return;
    setValue("scope.appliesTo", next, { shouldDirty: true });
    if (next !== "products") {
      setValue("scope.productIds", [], { shouldDirty: true });
    }
    if (next !== "categories") {
      setValue("scope.categoryIds", [], { shouldDirty: true });
    }
    if (next !== "brands") {
      setValue("scope.brandIds", [], { shouldDirty: true });
    }
    if (next !== "rules") {
      setValue("scope.rules", [], { shouldDirty: true });
    }
  };

  const { fields: ruleFields, append: appendRule, remove: removeRule } =
    useFieldArray({
      control,
      name: "scope.rules",
    });
  const [rulePreview, setRulePreview] = useState<{
    count: number;
    sample: { _id: string; name: string }[];
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const previewRules = async () => {
    setPreviewing(true);
    setRulePreview(null);
    try {
      const data = await previewPromotionRules({
        rules: getValues("scope.rules") ?? [],
        match: getValues("scope.match") ?? "all",
        offerId: selectedOfferId || undefined,
      });
      setRulePreview({ count: data.count, sample: data.sample });
    } catch {
      setSubmitError("Could not preview rules.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmitForm = async (data: FormValues) => {
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

    if (!data.offerId) {
      setSubmitError("Select an offer for this promotion.");
      return;
    }

    if (false && showScope) {
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
      if (s?.appliesTo === "rules") {
        const rules = (s.rules ?? []).filter((r: any) => r?.field);
        if (rules.length === 0) {
          setSubmitError("Add at least one rule.");
          return;
        }
      }
    }

    if (data.endDate <= data.startDate) {
      setSubmitError("End date must be after start date.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Defensive: read latest files state in case useEffect hasn't flushed.
      const latestImageUrl = files[0] || "";
      const payload: FormValues = {
        ...data,
        imageUrl: latestImageUrl || data.imageUrl || "",
      };
      await onSubmit(payload);
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
      className="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6 pb-24"
    >
      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 sm:px-4 text-[14px] text-destructive">
          {submitError}
        </div>
      )}

      {/* Details */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Promotion details</legend>

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
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

        {/* NEW — Banner image */}
        <div>
          <label className={labelCls}>Banner image</label>
          <FilesUploader
            files={files}
            loading={fileLoading}
            addFiles={addFiles}
            onRemove={handleRemoveImage}
          />
          <p className={helperCls}>
            Optional. Shown when this promotion is placed in a Content Block
            with display <code className="text-foreground">banner</code> and
            promotion mode <code className="text-foreground">self</code>.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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

      {/* Offer */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Offer</legend>
        <label className={labelCls}>
          Reusable offer <span className="text-destructive">*</span>
        </label>
        <select className={inputCls} {...register("offerId")}>
          <option value="">Custom discount (legacy)</option>
          {offers.map((offer) => (
            <option key={offer.value} value={offer.value}>
              {offer.label}
              {offer.sublabel ? ` — ${offer.sublabel}` : ""}
            </option>
          ))}
        </select>
        <p className={helperCls}>
          Offers are created from Marketing → Offers (percentage, fixed price,
          BXGY, bundle, free shipping). Only active offers are listed.
        </p>
        {offers.length === 0 && (
          <p className="text-[12px] text-destructive">
            No active offers found. Create one in Marketing → Offers first.
          </p>
        )}
      </fieldset>

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
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
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

      <div className="sticky bottom-0 -mx-3 flex flex-col-reverse gap-3 sm:-mx-6 sm:flex-row sm:items-center sm:justify-end border-t border-border bg-background/95 px-3 py-3 sm:px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-[14px] font-medium text-foreground transition hover:bg-muted sm:w-auto"
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