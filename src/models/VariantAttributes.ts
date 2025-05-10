import mongoose, { Schema, Document, models } from "mongoose";

interface IVariantAttribute extends Document {
  product_id: mongoose.Types.ObjectId;
  groupName: string;
  attributes: {
    name: string;
    value: string;
  }[];
  imageUrls: string[];
}

const VariantAttributeSchema = new Schema<IVariantAttribute>(
  {
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    groupName: {
      type: String,
      required: true,
    },
    attributes: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    imageUrls: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
VariantAttributeSchema.index({ product_id: 1, groupName: 1 });

export const VariantAttribute =
  models.VariantAttribute ||
  mongoose.model<IVariantAttribute>("VariantAttribute", VariantAttributeSchema);
