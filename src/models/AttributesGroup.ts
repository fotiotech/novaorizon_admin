import mongoose, { Schema, model, Document, models } from "mongoose";

interface IAttributeGroup extends Document {
  _id: string;
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  category_id: mongoose.Types.ObjectId;
}

const attributeGroupSchema = new Schema<IAttributeGroup>({
  name: { type: String, required: true, unique: true },
  parent_id: {
    type: Schema.Types.ObjectId,
    ref: "AttributeGroup",
  },
  category_id: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
});

const AttributeGroup =
  models.AttributeGroup ||
  model<IAttributeGroup>("AttributeGroup", attributeGroupSchema);

export default AttributeGroup;
