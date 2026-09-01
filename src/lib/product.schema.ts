import { z } from "zod";

// ============================================================================
// SUB-SCHEMAS FOR PRODUCT VALIDATION
// ============================================================================

// ProductCode sub-schema
export const ProductCodeSchema = z.object({
  type: z.enum(["EAN", "UPC", "ISBN", "QR", "MODEL"]),
  value: z.string().trim().min(1, "Product code value is required"),
});

// Key-Value pair with optional unit
export const KeyValueSchema = z.object({
  k: z.string().trim().min(1, "Key is required"),
  v: z.any(), // Can be string, number, boolean, etc.
  unit: z.string().optional(),
});

// Recursive specification group
export const SpecificationGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().trim().min(1, "Group name is required"),
    attributes: z.array(KeyValueSchema).default([]),
    groups: z.array(SpecificationGroupSchema).default([]),
  }),
);

// Variant sub-schema
export const VariantSchema = z.object({
  attributes: z.array(KeyValueSchema).default([]),
  sku: z.string().trim().min(1, "Variant SKU is required"),
  price: z.number().min(0, "Variant price cannot be negative").default(0),
  quantity: z.number().min(0, "Variant quantity cannot be negative").default(0),
  mainImage: z.string().optional(),
  images: z.array(z.string()).default([]),
});

// Related products structure
export const RelatedProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  relationshipType: z.string().optional(),
});

export const RelatedProductsSchema = z.object({
  ids: z.array(z.string()).default([]),
  relationshipType: z.string().optional(),
});

// ============================================================================
// MAIN PRODUCT SCHEMAS
// ============================================================================

// Schema for creating a new product
export const CreateProductSchema = z
  .object({
    categoryId: z.string().min(1, "Category is required"),
    brand: z.string().min(1, "Brand is required"),
    name: z.string().trim().min(1, "Product name is required"),
    sku: z.string().trim().min(1, "SKU is required"),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    quantity: z.number().min(0).default(0),
    lowStockThreshold: z.number().min(0).default(5),
    listPrice: z.number().min(0).default(0),
    price: z.number().min(0).default(0),
    mainImage: z.string().optional(),
    images: z.array(z.string()).default([]),
    hasVariants: z.boolean().default(false),
    variantThemes: z.array(z.string()).default([]),
    variants: z.array(VariantSchema).default([]),
    keyFeatures: z.array(KeyValueSchema).default([]),
    specifications: z.array(SpecificationGroupSchema).default([]),
    carrier: z.string().optional(),
    relatedProducts: z
      .array(RelatedProductSchema)
      .or(RelatedProductsSchema)
      .default([]),
    tags: z.array(z.string()).default([]),
    status: z.enum(["draft", "active", "inactive"]).default("draft"),
    productCode: z.array(ProductCodeSchema).default([]),
  })
  .passthrough();

// Schema for updating a product (all fields optional except ID)
export const UpdateProductSchema = CreateProductSchema.partial().extend({
  _id: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
});

// Schema for create or update (used in createOrUpdateProduct)
export const CreateOrUpdateProductSchema = CreateProductSchema.partial().extend(
  {
    _id: z.string().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
    __v: z.any().optional(),
  },
);

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates product data against the create schema
 * @param data - Product data to validate
 * @returns Validated data or throws ZodError
 */
export function validateProductCreate(data: unknown) {
  return CreateProductSchema.parse(data);
}

/**
 * Validates product data against the update schema
 * @param data - Product data to validate
 * @returns Validated data or throws ZodError
 */
export function validateProductUpdate(data: unknown) {
  return UpdateProductSchema.parse(data);
}

/**
 * Validates product data against the create or update schema
 * @param data - Product data to validate
 * @returns Validated data or throws ZodError
 */
export function validateProductCreateOrUpdate(data: unknown) {
  return CreateOrUpdateProductSchema.parse(data);
}

/**
 * Safe validation that returns a result object instead of throwing
 * @param data - Product data to validate
 * @param schema - Zod schema to validate against
 * @returns { success: boolean, data?: T, error?: string }
 */
export function safeValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
): { success: boolean; data?: T; error?: string } {
  try {
    const validatedData = schema.parse(data);
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

/**
 * Safe validation for product creation
 */
export function safeValidateProductCreate(data: unknown) {
  return safeValidate(data, CreateProductSchema);
}

/**
 * Safe validation for product update
 */
export function safeValidateProductUpdate(data: unknown) {
  return safeValidate(data, UpdateProductSchema);
}

/**
 * Safe validation for product create or update
 */
export function safeValidateProductCreateOrUpdate(data: unknown) {
  return safeValidate(data, CreateOrUpdateProductSchema);
}
