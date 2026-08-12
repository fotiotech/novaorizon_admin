import mongoose, { Schema, Document } from "mongoose";

export interface IAttributeGroup extends Document {
  _id: string;
  code: string;
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  attributes?: { id: mongoose.Types.ObjectId; isRequired: boolean }[];
  createdAt?: Date;
  sort_order: number;
}

const attributeGroupSchema = new Schema<IAttributeGroup>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "AttributeGroup",
    },
    attributes: [
      {
        id: { type: Schema.Types.ObjectId, ref: "Attribute" },
        isRequired: { type: Boolean, default: false },
      },
    ],
    sort_order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

const AttributeGroup =
  mongoose.models.AttributeGroup ||
  mongoose.model<IAttributeGroup>("AttributeGroup", attributeGroupSchema);

export default AttributeGroup;
