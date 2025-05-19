import mongoose, { Schema, model, models, Document } from "mongoose";

const CategoryAttributeSchema = new Schema({
  category_id: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  attributes: [{ type: mongoose.Types.ObjectId, ref: "Attribute" }],
  created_at: { type: Date, default: Date.now },
});

// Product Attribute Value Model
const CategoryAttribute =
  models.CategoryAttribute ||
  model("CategoryAttribute", CategoryAttributeSchema);
export default CategoryAttribute;
