import { Variant } from "@/models/Variant";

export async function getVariantDetails(variantId: string) {
  const variant = await Variant.findById(variantId)
    .populate("product_id") // Populate the parent product
    .exec();

  if (!variant) throw new Error("Variant not found");

  // Merge parent product and variant properties
  const inheritedDetails = {
    name: (variant.product_id as any).productName, // Parent product name
    category: (variant.product_id as any).category_id,
    brand: (variant.product_id as any).brand_id,
    finalPrice: variant.finalPrice || (variant.product_id as any).finalPrice, // Use variant price or base price
    attributes: variant.attributes,
    stockQuantity: variant.stockQuantity,
  };

  return inheritedDetails;
}
