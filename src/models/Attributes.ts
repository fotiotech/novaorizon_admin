import mongoose, { Schema, model, models, Document } from "mongoose";

// Attribute Interface
interface IAttribute extends Document {
  groupId: Schema.Types.ObjectId;
  isVariant?: boolean;
  is_highlight?: boolean;
  name: string;
  option?: string[];
  type: "select" | "multiselect" | "text" | "number" | "boolean"; // Added the missing 'type' property
}

// Attribute Schema
const AttributeSchema = new Schema<IAttribute>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "AttributeGroup",
    required: [true, "Group ID is required"],
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
      "select",
      "multiselect",
      "text",
      "number",
      "boolean",
      "file",
      "textarea",
      "date",
    ], // Added the missing 'type' property
  }, // Added the missing 'type' property},
});

AttributeSchema.index({ name: 1 });

// Attribute Model
const Attribute =
  models.Attribute || model<IAttribute>("Attribute", AttributeSchema);
export default Attribute;
