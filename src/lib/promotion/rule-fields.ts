// lib/promotion/rule-fields.ts

export type RuleFieldType = "number" | "string" | "boolean" | "array";

/** Fields available to promotion/offer eligibility rules. */
export const PROMOTION_RULE_FIELDS = [
  { value: "price", label: "Price", type: "number" },
  { value: "listPrice", label: "List price", type: "number" },
  { value: "tags", label: "Tags", type: "array" },
  { value: "ratingAverage", label: "Rating average", type: "number" },
  { value: "ratingCount", label: "Rating count", type: "number" },
  { value: "stats.views", label: "Views", type: "number" },
  { value: "stats.cartAdds", label: "Cart adds", type: "number" },
  { value: "stats.purchases", label: "Purchases", type: "number" },
  { value: "stats.likes", label: "Likes", type: "number" },
  { value: "stats.revenue", label: "Revenue", type: "number" },
  { value: "isFeatured", label: "Featured", type: "boolean" },
  { value: "isTrending", label: "Trending", type: "boolean" },
  { value: "isBestseller", label: "Bestseller", type: "boolean" },
  { value: "newArrival", label: "New arrival", type: "boolean" },
  { value: "status", label: "Status", type: "string" },
  { value: "name", label: "Name", type: "string" },
  { value: "offer.type", label: "Offer type", type: "string" },
  { value: "offer.name", label: "Offer name", type: "string" },
  { value: "offer.discountValue", label: "Offer discount value", type: "number" },
  { value: "offer.buyQuantity", label: "Offer buy quantity", type: "number" },
  { value: "offer.getQuantity", label: "Offer get quantity", type: "number" },
  { value: "offer.bundleQuantity", label: "Offer bundle quantity", type: "number" },
] as const;

const OPERATORS_BY_TYPE: Record<RuleFieldType, string[]> = {
  number: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$exists"],
  string: ["$eq", "$ne", "$contains", "$in", "$nin", "$exists"],
  boolean: ["$eq", "$ne", "$exists"],
  array: ["$contains", "$in", "$nin", "$exists"],
};

export function fieldType(field: string): RuleFieldType {
  return (
    PROMOTION_RULE_FIELDS.find((entry) => entry.value === field)?.type ??
    "string"
  );
}

export function operatorsForField(field: string): string[] {
  return OPERATORS_BY_TYPE[fieldType(field)];
}