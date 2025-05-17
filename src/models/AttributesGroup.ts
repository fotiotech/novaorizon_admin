import mongoose, { Schema, model, Document, models } from "mongoose";

interface IAttributeGroup extends Document {
  _id: string;
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  group_order: number;
  sort_order: number;
}

const attributeGroupSchema = new Schema<IAttributeGroup>(
  {
    name: { type: String, required: true },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "AttributeGroup",
    },
    group_order: { type: Number, default: 0 },
    sort_order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);


const AttributeGroup =
  models.AttributeGroup ||
  model<IAttributeGroup>("AttributeGroup", attributeGroupSchema);

export default AttributeGroup;
