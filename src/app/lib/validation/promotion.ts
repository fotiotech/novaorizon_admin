// lib/validations/promotion.ts
import { z } from "zod";

export const promotionSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().optional(),
  type: z.enum(["percentage", "fixed_amount", "buy_x_get_y", "free_shipping", "bundle_discount"]),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
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
  property: z.array(z.string()).default([]),
});

export type PromotionFormValues = z.infer<typeof promotionSchema>;