import mongoose, { Schema, model, models, Document } from "mongoose";

// Attribute Interface
interface IAttribute extends Document {
  groupId: Schema.Types.ObjectId;
  isVariant?: boolean;
  is_highlight?: boolean;
  name: string;
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
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "AttributeGroup",
  },

  name: {
    type: String,
    unique: true,
    required: [true, "Attribute name is required"],
  },
  option: [{ type: String }],
  is_highlight: {
    type: Boolean,
    default: false,
  },
  isVariant: {
    type: Boolean,
    default: false,
  },
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

AttributeSchema.index({ name: 1 });

// Attribute Model
const Attribute =
  models.Attribute || model<IAttribute>("Attribute", AttributeSchema);
export default Attribute;
