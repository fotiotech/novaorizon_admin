// lib/promotion/calc-fields.ts

export type CalcFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "multi-select"
  | "date";

export interface CalcFieldDef {
  code: string;
  name: string;
  type: CalcFieldType;
  isRequired?: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: { min?: number; max?: number };
  helpText?: string;
  /** When true, the composer replaces `options` with live product IDs. */
  productPicker?: boolean;
}

export const CALC_FIELDS: Record<string, CalcFieldDef[]> = {
  percentage: [
    {
      code: "percentage",
      name: "Percentage off",
      type: "number",
      isRequired: true,
      validation: { min: 1, max: 100 },
      helpText: "Between 1 and 100.",
    },
    {
      code: "maxDiscount",
      name: "Maximum discount",
      type: "number",
      helpText: "Optional cap. Leave empty for no limit.",
    },
  ],
  fixed_amount: [
    {
      code: "amount",
      name: "Amount off",
      type: "number",
      isRequired: true,
      validation: { min: 1 },
    },
    {
      code: "minOrderAmount",
      name: "Minimum order amount",
      type: "number",
      helpText: "Optional. Cart must reach this to qualify.",
    },
  ],
  buy_x_get_y: [
    {
      code: "buyQuantity",
      name: "Buy quantity",
      type: "number",
      isRequired: true,
      defaultValue: 1,
      validation: { min: 1 },
    },
    {
      code: "getQuantity",
      name: "Get quantity",
      type: "number",
      isRequired: true,
      defaultValue: 1,
      validation: { min: 1 },
    },
    {
      code: "buyProductIds",
      name: "Buy these products",
      type: "multi-select",
      productPicker: true,
      helpText: "Leave empty to apply to any product.",
    },
    {
      code: "getProductIds",
      name: "Give these products",
      type: "multi-select",
      productPicker: true,
      helpText: "Leave empty to give away the cheapest items.",
    },
  ],
  free_shipping: [
    {
      code: "maxShippingCost",
      name: "Max shipping covered",
      type: "number",
      helpText: "Optional cap. Leave empty to cover the full shipping cost.",
    },
  ],
  bundle_discount: [
    {
      code: "productIds",
      name: "Bundle products",
      type: "multi-select",
      isRequired: true,
      productPicker: true,
      helpText: "Cart must contain all selected products.",
    },
    {
      code: "bundleQuantity",
      name: "Quantity per product",
      type: "number",
      isRequired: true,
      defaultValue: 1,
      validation: { min: 1 },
    },
    {
      code: "discountAmount",
      name: "Discount amount",
      type: "number",
      isRequired: true,
      validation: { min: 1 },
    },
  ],
};

export const CALC_LABELS: Record<string, string> = {
  percentage: "Percentage off order",
  fixed_amount: "Fixed amount off order",
  buy_x_get_y: "Buy X, get Y",
  free_shipping: "Free shipping",
  bundle_discount: "Bundle discount",
};

export function fieldsFor(calcType: string): CalcFieldDef[] {
  return CALC_FIELDS[calcType] ?? [];
}
