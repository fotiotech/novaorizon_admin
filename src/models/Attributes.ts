
import mongoose, { Schema, model, models, Document } from "mongoose";

// Attribute Interface
interface IAttribute extends Document {
  groupId: Schema.Types.ObjectId;
  isVariant?: boolean;
  name: string;
  // code: string;
  type: "select" | "multiselect" | "text" | "number" | "boolean"; // Added the missing 'type' property
}

// Attribute Schema
const AttributeSchema = new Schema<IAttribute>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "AttributeGroup",
    required: [true, "Group ID is required"],
  },
  // code: {
  //   type: String,
  //   unique: true,
  //   required: [true, "Attribute name is required"],
  // },
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
    enum: ["select", "multiselect", "text", "number", "boolean", 'file', 'textarea', 'date'], // Added the missing 'type' property
  }, // Added the missing 'type' property},
 
});

// Attribute Model
const Attribute =
  models.Attribute || model<IAttribute>("Attribute", AttributeSchema);
export default Attribute;
