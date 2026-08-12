import mongoose, { Document, Model, Schema } from "mongoose";
import { IAttribute } from "./Attribute";
import { IAttributeGroup } from "./AttributeGroup";

export interface IAttributeSet extends Document {
  title: string;
  code: string;
  description?: string;
  groups: IAttributeGroup[];
  sort_order?: number;
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
    groups: [
      { type: Schema.Types.ObjectId, ref: "AttributeGroup", default: [] },
    ],
    sort_order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const AttributeSet: Model<IAttributeSet> =
  mongoose.models.AttributeSet ||
  mongoose.model<IAttributeSet>("AttributeSet", AttributeSetSchema);

export default AttributeSet;
