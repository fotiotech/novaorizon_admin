// components/PromotionPropertyForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PromotionPropertyFormValues,
  promotionPropertySchema,
} from "@/app/lib/validation/promotionProperty";

interface PromotionPropertyFormProps {
  initialValues?: Partial<PromotionPropertyFormValues>;
  onSubmit: (data: PromotionPropertyFormValues) => Promise<any>;
}

// ─── Shared visual tokens ────────────────────────────────────────────
const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const errorCls = "mt-1.5 text-[13px] text-destructive";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";

export function PromotionPropertyForm({
  initialValues,
  onSubmit,
}: PromotionPropertyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    setValue,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PromotionPropertyFormValues>({
    resolver: zodResolver(promotionPropertySchema) as any,
    defaultValues: {
      code: "",
      name: "",
      isRequired: false,
      sortOrder: 0,
      options: [],
      type: "text",
      ...initialValues,
    },
  });

  const selectedType = watch("type");
  const optionsValue = watch("options") ?? [];
  const showOptions = ["select", "checkbox", "radio", "multi-select"].includes(
    selectedType,
  );

  const onFormSubmit = async (data: PromotionPropertyFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const cleaned = {
        ...data,
        options: (data.options ?? []).map((o: any) => o.trim()).filter(Boolean),
      };
      await onSubmit(cleaned);
      router.push("/marketing/promotions/properties");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="mx-auto w-full max-w-xl space-y-6 pb-24"
    >
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
          {error}
        </div>
      )}

      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Identity</legend>

        <div>
          <label className={labelCls}>
            Name <span className="text-destructive">*</span>
          </label>
          <input
            {...register("name")}
            placeholder="e.g., Discount value"
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
            placeholder="e.g., discount_value"
            className={inputCls}
          />
          {errors.code && <p className={errorCls}>{errors.code.message}</p>}
          <p className={helperCls}>
            Used internally. Lowercase, snake_case recommended.
          </p>
        </div>
      </fieldset>

      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Field</legend>

        <div>
          <label className={labelCls}>
            Type <span className="text-destructive">*</span>
          </label>
          <select {...register("type")} className={inputCls}>
            <option value="text">Text</option>
            <option value="textarea">Textarea</option>
            <option value="number">Number</option>
            <option value="select">Select</option>
            <option value="multi-select">Multi-select</option>
            <option value="checkbox">Checkbox</option>
            <option value="radio">Radio</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="color">Color</option>
            <option value="file">File</option>
            <option value="url">URL</option>
          </select>
          {errors.type && <p className={errorCls}>{errors.type.message}</p>}
        </div>

        {showOptions && (
          <div>
            <label className={labelCls}>Options</label>
            <textarea
              className={`${inputCls} resize-y font-mono text-[14px]`}
              rows={5}
              placeholder={"Option 1\nOption 2\nOption 3"}
              value={optionsValue.join("\n")}
              onChange={(e) =>
                setValue("options", e.target.value.split("\n"), {
                  shouldDirty: true,
                })
              }
            />
            <p className={helperCls}>One option per line.</p>
          </div>
        )}
      </fieldset>

      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Behavior</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Sort order</label>
            <input
              type="number"
              {...register("sortOrder", { valueAsNumber: true })}
              className={inputCls}
            />
            {errors.sortOrder && (
              <p className={errorCls}>{errors.sortOrder.message}</p>
            )}
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
              <input
                type="checkbox"
                {...register("isRequired")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              Required
            </label>
          </div>
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
          {isSubmitting ? "Saving…" : "Save property"}
        </button>
      </div>
    </form>
  );
}
