import mongoose, { Schema, model, models, Document } from "mongoose";
// Product Attribute Value Interface
interface IProductAttributeValue extends Document {
  product_id: mongoose.Types.ObjectId;
  attribute_id: mongoose.Types.ObjectId;
  value_id: mongoose.Types.ObjectId;
}

// Product Attribute Value Schema
const ProductAttributeValueSchema = new Schema<IProductAttributeValue>({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  attribute_id: {
    type: Schema.Types.ObjectId,
    ref: "Attribute",
    required: true,
  },
  value_id: {
    type: Schema.Types.ObjectId,
    ref: "AttributeValue",
    required: true,
  },
});

// Product Attribute Value Model
const ProductAttributeValue =
  models.ProductAttributeValue ||
  model<IProductAttributeValue>(
    "ProductAttributeValue",
    ProductAttributeValueSchema
  );
export default ProductAttributeValue;
