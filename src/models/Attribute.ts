import mongoose, { Schema, model, models, Document } from "mongoose";

// Attribute Interface
export interface IAttribute extends Document {
  code: string;
  unitFamily?: mongoose.Types.ObjectId | null; // Reference to UnitFamily, can be null
  isRequired: boolean;
  name: string;
  sortOrder: number;
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
  unitFamily: {
    type: Schema.Types.ObjectId,
    ref: "UnitFamily",
    default: null,
  },
  isRequired: {
    type: Boolean,
  },
  name: {
    type: String,
    unique: true,
    required: [true, "Attribute name is required"],
  },
  sortOrder: {
    type: Number,
    required: [true, "Attribute sortOrder is required"],
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
const Attribute =
  models.Attribute || model<IAttribute>("Attribute", AttributeSchema);
export default Attribute;
