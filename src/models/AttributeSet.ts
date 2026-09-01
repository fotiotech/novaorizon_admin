import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAttributeSet extends Document {
  title: string;
  code: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const AttributeSetSchema = new Schema<IAttributeSet>(
  {
    title: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: [true, "Code is required"],
      unique: true,
      trim: true,
    },
    description: { type: String, required: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const AttributeSet: Model<IAttributeSet> =
  mongoose.models.AttributeSet ||
  mongoose.model<IAttributeSet>("AttributeSet", AttributeSetSchema);

export default AttributeSet;
