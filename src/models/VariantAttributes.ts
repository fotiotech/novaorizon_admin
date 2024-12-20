import mongoose, { Schema, Document, models } from "mongoose";

const VariantAttributeSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  values: { type: [String], required: true },
});

export const VariantAttribute =
  models.VariantAttribute ||
  mongoose.model("VariantAttribute", VariantAttributeSchema);
