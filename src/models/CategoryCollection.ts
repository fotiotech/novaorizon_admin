// models/CategoryCollection.ts
import mongoose, { Schema } from "mongoose";

const ruleSchema = new Schema({
  attribute: { type: String, required: true },
  operator: {
    type: String,
    enum: ["$in", "$nin", "$eq", "$ne", "$lt", "$lte", "$gt", "$gte"],
    required: true,
  },
  value: { type: Schema.Types.Mixed, required: true },
  position: { type: Number, required: true, min: 0 },
});

const CategoryCollectionSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    type: {
      type: String,
      enum: ["rule", "manual", "recommendation", "related"],
      default: "rule",
    },
    recommendationType: {
      type: String,
      enum: ["trending", "personalized", "recentlyViewed"],
    },
    recommendationLimit: {
      type: Number,
      default: 10,
    },
    // Category collections are strictly limited to Category targets.
    targetType: {
      type: String,
      enum: ["Category"],
      default: "Category",
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    rules: [ruleSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    order: { type: Number, default: 0, min: 0 },
    showName: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

CategoryCollectionSchema.pre("save", function (next) {
  if (this.rules) {
    this.rules.sort((a, b) => a.position - b.position);
  }
  next();
});

CategoryCollectionSchema.index({ name: 1 }, { unique: true });
CategoryCollectionSchema.index({ status: 1 });
CategoryCollectionSchema.index({ "rules.attribute": 1 });
CategoryCollectionSchema.index({ order: 1 });

export const CategoryCollection =
  mongoose.models.CategoryCollection ||
  mongoose.model("CategoryCollection", CategoryCollectionSchema);
