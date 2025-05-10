import mongoose, { Schema, model, models, Document } from "mongoose";
// Attribute Value Interface
interface IAttributeValue extends Document {
    attribute_id: mongoose.Types.ObjectId;
    value: string;
  }
  
  // Attribute Value Schema
  const AttributeValueSchema = new Schema<IAttributeValue>({
    attribute_id: {
      type: Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
    },
    value: {
      type: String,
      required: [true, "Attribute value is required"],
    },
  });

  // Attribute Value Model
  const AttributeValue = models.AttributeValue || model<IAttributeValue>("AttributeValue", AttributeValueSchema);
  export default AttributeValue;
  