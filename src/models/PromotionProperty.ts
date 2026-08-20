import mongoose, { Schema, model, models, Document } from "mongoose";

// PromotionProperty Interface
export interface IPromotionProperty {
  code: string;
  isRequired: boolean;
  name: string;
  sort_order: number;
  option?: string[];
  type:
    | "text"
    | "select"
    | "checkbox"
    | "radio"
    | "boolean"
    | "textarea"
    | "number"
    | "date"
    | "color"
    | "file"
    | "url"
    | "multi-select"; // Added the missing 'type' property
}

// Attribute Schema
const PromotionPropertySchema = new Schema<IPromotionProperty>({
  code: {
    type: String,
    unique: true,
    required: [true, "Promotion Property code is required"],
  },

  isRequired: {
    type: Boolean,
  },
  name: {
    type: String,
    unique: true,
    required: [true, "Promotion Property name is required"],
  },
  sort_order: {
    type: Number,
    required: [true, "Promotion Property sort_order is required"],
  },
  option: [{ type: String }],

  type: {
    type: String,
    enum: [
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
    ],
    required: true,
  },
});

// Attribute Model
const PromotionProperty =
  models.PromotionProperty || model<IPromotionProperty>("PromotionProperty", PromotionPropertySchema);
export default PromotionProperty;
