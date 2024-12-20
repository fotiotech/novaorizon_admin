import mongoose, { Schema, Document, model, models } from "mongoose";

const regionSchema = new Schema({
  region: { type: String, required: true },
  basePrice: { type: Number, required: true },
  averageDeliveryTime: { type: String, required: true },
});

const carrierSchema = new Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true },
  regionsServed: { type: [regionSchema], required: true }, // Array of objects
  costWeight: { type: Number, required: true },
});

export default models.Carrier || model("Carrier", carrierSchema);
