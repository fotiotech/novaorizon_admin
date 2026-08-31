import { z } from "zod";

export const FacebookAdsConnectionSchema = z.object({
  accountName: z.string().min(1, "Account name is required."),
  appId: z.string().min(1, "Meta app ID is required."),
  appSecret: z.string().min(1, "Meta app secret is required."),
  accessToken: z.string().min(1, "Meta access token is required."),
  adAccountId: z.string().min(1, "Ad account ID is required."),
  pageId: z.string().optional().or(z.literal("")),
  pixelId: z.string().optional().or(z.literal("")),
  businessManagerId: z.string().optional().or(z.literal("")),
  catalogId: z.string().optional().or(z.literal("")),
  catalogName: z.string().optional().or(z.literal("")),
  catalogType: z
    .enum(["Ecommerce", "Travel", "RealEstate", "Auto"])
    .optional()
    .default("Ecommerce"),
  catalogEnabled: z.boolean().optional().default(false),
  defaultObjective: z.enum([
    "sales",
    "leads",
    "traffic",
    "awareness",
    "engagement",
    "catalog_sales",
  ]),
  apiVersion: z.string().min(1, "API version is required."),
});

export type FacebookAdsConnectionInput = z.infer<
  typeof FacebookAdsConnectionSchema
>;
