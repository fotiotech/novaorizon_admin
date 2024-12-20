import mongoose, { Schema, model, models, Document } from "mongoose";

// Attribute Interface
interface IAttribute extends Document {
  group: string;
  getVariant?: boolean;
  name: string;
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
  getVariant: {
    type: Boolean,
    default: false,
  },
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
