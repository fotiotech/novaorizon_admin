// lib/validations/promotionProperty.ts
import { z } from "zod";

export const promotionPropertySchema = z.object({
  code: z.string().min(1, "Code is required").trim(),
  name: z.string().min(1, "Name is required").trim(),
  isRequired: z.boolean().default(false),
  sort_order: z.number().min(0, "Sort order must be >= 0").default(0),
  option: z.array(z.string()).default([]),
  type: z.enum([
    "text",
    "select",
    "checkbox",
    "radio",
    "boolean",
    "textarea",
    "number",
    "date",
    "color",
    "file",
    "url",
    "multi-select",
  ]),
});

export type PromotionPropertyFormValues = z.infer<typeof promotionPropertySchema>;