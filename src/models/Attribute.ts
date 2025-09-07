import mongoose, { Schema, model, models, Document } from "mongoose";

// Attribute Interface
interface IAttribute extends Document {
  code: string;
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
const AttributeSchema = new Schema<IAttribute>({
  code: {
    type: String,
    unique: true,
    required: [true, "Attribute code is required"],
  },
  name: {
    type: String,
    unique: true,
    required: [true, "Attribute name is required"],
  },
  sort_order: {
    type: Number,
    required: [true, "Attribute sort_order is required"],
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

AttributeSchema.index({ code: 1 });
AttributeSchema.index({ name: 1 });

// Attribute Model
const Attribute =
  models.Attribute || model<IAttribute>("Attribute", AttributeSchema);
export default Attribute;
