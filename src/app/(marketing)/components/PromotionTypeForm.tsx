// components/PromotionTypeForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

const promotionTypeSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  code: z.string().min(1, "Code is required").trim(),
  description: z.string().optional(),
  calculationType: z.enum([
    "percentage",
    "fixed_amount",
    "buy_x_get_y",
    "free_shipping",
    "bundle_discount",
  ]),
  properties: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  icon: z.string().optional(),
});

type PromotionTypeFormValues = z.infer<typeof promotionTypeSchema>;

interface PromotionTypeFormProps {
  initialValues?: Partial<PromotionTypeFormValues>;
  onSubmit: (data: PromotionTypeFormValues) => Promise<any>;
  availableProperties: { label: string; value: string }[];
}

// ─── Shared visual tokens ────────────────────────────────────────────
const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const errorCls = "mt-1.5 text-[13px] text-destructive";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";

export function PromotionTypeForm({
  initialValues,
  onSubmit,
  availableProperties,
}: PromotionTypeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PromotionTypeFormValues>({
    resolver: zodResolver(promotionTypeSchema) as any,
    defaultValues: {
      name: "",
      code: "",
      description: "",
      calculationType: "percentage",
      properties: [],
      isActive: true,
      icon: "",
      ...initialValues,
    },
  });

  const onFormSubmit = async (data: PromotionTypeFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(data);
      router.push("/marketing/promotions/types");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="mx-auto w-full max-w-2xl space-y-6 pb-24"
    >
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
          {error}
        </div>
      )}

      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Basic info</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>
              Name <span className="text-destructive">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g., Seasonal discount"
              className={inputCls}
            />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>
              Code <span className="text-destructive">*</span>
            </label>
            <input
              {...register("code")}
              placeholder="e.g., seasonal_discount"
              className={inputCls}
            />
            {errors.code && <p className={errorCls}>{errors.code.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Optional, shown to admins only"
            className={`${inputCls} resize-y`}
          />
        </div>
      </fieldset>

      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Calculation</legend>

        <div>
          <label className={labelCls}>
            Calculation type <span className="text-destructive">*</span>
          </label>
          <select {...register("calculationType")} className={inputCls}>
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount</option>
            <option value="buy_x_get_y">Buy X Get Y</option>
            <option value="free_shipping">Free shipping</option>
            <option value="bundle_discount">Bundle discount</option>
          </select>
          {errors.calculationType && (
            <p className={errorCls}>{errors.calculationType.message}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Icon</label>
          <input
            {...register("icon")}
            placeholder="e.g., 🎉"
            className={`${inputCls} max-w-[140px]`}
          />
          <p className={helperCls}>
            Optional emoji or short glyph shown next to the type.
          </p>
        </div>
      </fieldset>

      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Properties</legend>

        <div>
          <label className={labelCls}>Attached properties</label>
          <select
            multiple
            {...register("properties")}
            className={`${inputCls} h-auto`}
            size={5}
          >
            {availableProperties.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <p className={helperCls}>Hold Ctrl/Cmd to select multiple.</p>
        </div>
      </fieldset>

      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Visibility</legend>

        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
          <input
            type="checkbox"
            {...register("isActive")}
            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
          />
          Active
        </label>
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
          {isSubmitting ? "Saving…" : "Save type"}
        </button>
      </div>
    </form>
  );
}
