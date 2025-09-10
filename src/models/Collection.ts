// models/Collection.js
import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  ctaText: String,
  ctaUrl: String,
  imageUrl: String,
  position: { type: Number, default: 0 },
});

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  display: { type: String, enum: ["grid", "carrousel"], default: "grid" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  groups: [groupSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Collection =
  mongoose.models.Collection || mongoose.model("Collection", collectionSchema);
