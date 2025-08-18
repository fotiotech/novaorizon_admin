import mongoose, { Schema, Document } from "mongoose";

interface IAttributeGroup extends Document {
  _id: string;
  code: string;
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  attributes?: mongoose.Types.ObjectId[];
  createdAt?: Date;
  group_order: number;
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
    attributes: [{ type: Schema.Types.ObjectId, ref: "Attribute" }],
    group_order: { type: Number, default: 0 },
    sort_order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster queries
attributeGroupSchema.index({ code: 1 }, { unique: true });
attributeGroupSchema.index({ group_order: 1 });

const AttributeGroup =
  mongoose.models.AttributeGroup ||
  mongoose.model<IAttributeGroup>("AttributeGroup", attributeGroupSchema);

export default AttributeGroup;
