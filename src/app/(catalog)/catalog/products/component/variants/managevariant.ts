import { useAppSelector } from "@/app/hooks";
import { useMemo } from "react";
const { variantAttributes } = useAppSelector((state) => state.product.byId);

const memoizedVariantAttributes = useMemo(
  () => variantAttributes,
  [variantAttributes]
);

export const AttributesVariants = useMemo(() => {
  // Generate variations for each variant
  return generateVariations(memoizedVariantAttributes || {});
}, [memoizedVariantAttributes]);

function generateVariations(variantAttributesData: {
  [groupName: string]: { [attributeName: string]: string[] };
}) {
  if (
    !variantAttributesData ||
    Object.keys(variantAttributesData).length === 0
  ) {
    console.log("No variantAttributesData");
    return; // Return an empty array if input is empty or undefined
  }

  // Step 1: Flatten the attributes from all groups
  const flattenedAttributes = Object.values(variantAttributesData).reduce(
    (acc, groupAttributes) => {
      Object.entries(groupAttributes).forEach(([attrName, attrValues]) => {
        acc[attrName] = attrValues; // Combine attributes from all groups
      });
      return acc;
    },
    {} as { [attrName: string]: string[] }
  );

  // Step 2: Generate separate objects for each attribute and value
  const result = Object.entries(flattenedAttributes).flatMap(
    ([attrName, attrValues]) =>
      attrValues.map((value) => ({
        [attrName]: value, // Map attribute to its value
        variantName: "", // Placeholder for the variant name
        product_id: "", // Placeholder for product ID
        sku: "", // Placeholder for SKU
        basePrice: 0, // Default base price
        finalPrice: 0, // Default final price
        taxRate: 0, // Default tax rate
        discount: 0, // Default discount
        currency: "", // Default currency
        VProductCode: "", // Default product code
        stockQuantity: 0, // Default stock quantity
        imageUrls: [], // Default image URLs
        offerId: "", // Placeholder for offer ID
        category_id: "", // Placeholder for category ID
        status: "active", // Default status
      }))
  );

  return result;
}
