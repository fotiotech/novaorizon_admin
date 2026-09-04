import { z } from "zod";

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

// ProductCode – single object
const ProductCodeSchema = z.object({
  type: z.enum(["EAN", "UPC", "ISBN", "QR", "MODEL"]),
  value: z.string().trim().min(1, "Product code value is required"),
});

// Key-Value pair
const KeyValueSchema = z.object({
  k: z.string().trim().min(1, "Key is required"),
  v: z.any(),
  unit: z.string().optional(),
});

// Recursive specification group
const SpecificationGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().trim().min(1, "Group name is required"),
    attributes: z.array(KeyValueSchema).default([]),
    groups: z.array(SpecificationGroupSchema).default([]),
  }),
);

// Variant
const VariantSchema = z.object({
  attributes: z.array(KeyValueSchema).default([]),
  sku: z.string().trim().min(1, "Variant SKU is required"),
  price: z.number().min(0).default(0),
  quantity: z.number().min(0).default(0),
  images: z.array(z.string()).default([]),
});

// Related product entry
const RelatedProductEntrySchema = z
  .object({
    product: z.string().optional(),
    id: z.string().optional(),
    relationshipType: z.string().optional(),
  })
  .refine((data) => data.product || data.id, {
    message: "Either product or id must be provided",
  });

// productCode may be object, array of objects, null, or undefined – transform array to first element
const ProductCodeOrArraySchema = z
  .union([ProductCodeSchema, z.array(ProductCodeSchema), z.null()])
  .transform((val) => {
    if (Array.isArray(val)) {
      return val.length > 0 ? val[0] : null;
    }
    return val;
  })
  .nullable()
  .optional();

// ============================================================================
// UNIFIED SCHEMA (for createOrUpdateProduct)
// ============================================================================

export const CreateOrUpdateProductSchema = z
  .object({
    // Optional _id for updates
    _id: z.string().optional(),

    // Core fields (all optional – partial for updates, but can be required for create)
    categoryId: z.string().min(1, "Category is required").optional(),
    brand: z.string().min(1, "Brand is required").optional(),
    name: z.string().trim().min(1, "Product name is required").optional(),
    sku: z.string().trim().min(1, "SKU is required").optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    quantity: z.number().min(0).default(0).optional(),
    lowStockThreshold: z.number().min(0).default(5).optional(),
    listPrice: z.number().min(0).default(0).optional(),
    price: z.number().min(0).default(0).optional(),
    images: z.array(z.string()).default([]).optional(),
    hasVariants: z.boolean().default(false).optional(),
    variantThemes: z.array(z.string()).default([]).optional(),
    variants: z.array(VariantSchema).default([]).optional(),
    keyFeatures: z.array(KeyValueSchema).default([]).optional(),
    specifications: z.array(SpecificationGroupSchema).default([]).optional(),
    carrier: z.string().optional(),
    relatedProducts: z.array(RelatedProductEntrySchema).default([]).optional(),
    tags: z.array(z.string()).default([]).optional(),
    status: z.enum(["draft", "active", "inactive"]).default("draft").optional(),

    // productCode – can be object, array, null, undefined
    productCode: ProductCodeOrArraySchema,

    // Allow dynamic category attributes (passthrough)
  })
  .passthrough();

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Safe validation for product create or update
 * @param data - Product data to validate
 * @returns { success: boolean; data?: T; error?: string }
 */
export function safeValidateProductCreateOrUpdate(data: unknown) {
  try {
    const validatedData = CreateOrUpdateProductSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return { success: false, error: errorMessages };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}
