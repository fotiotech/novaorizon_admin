import mongoose, { Schema, model, models, Document } from "mongoose";

// Attribute Interface
interface IAttribute extends Document {
  group: string;
  isVariant?: boolean;
  name: string;
  type: "select" | "multiselect" | "text" | "number" | "boolean"; // Added the missing 'type' property
  category_id: mongoose.Types.ObjectId;
}

// Attribute Schema
const AttributeSchema = new Schema<IAttribute>({
  group: {
    type: String,
  },
  name: {
    type: String,
    required: [true, "Attribute name is required"],
  },
  isVariant: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ["select", "multiselect", "text", "number", "boolean"],
  }, // Added the missing 'type' property},
  category_id: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
});

// Attribute Model
const Attribute =
  models.Attribute || model<IAttribute>("Attribute", AttributeSchema);
export default Attribute;
