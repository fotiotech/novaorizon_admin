// lib/validations/promotion.ts
import { z } from "zod";

export const promotionSchema = z.object({
  promotionTypeId: z.string().min(1, "Promotion type is required"),
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().optional(),
  startDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  endDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
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

export type PromotionFormValues = z.infer<typeof promotionSchema>;
