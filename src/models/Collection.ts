import mongoose, { Schema, Document } from "mongoose";

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

const CollectionSchema = new Schema(
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
    targetType: {
      type: String,
      enum: ["Category", "Product", "Brand", "Collection", "Promotion", "Page"],
      default: "Product",
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        refPath: "targetType",
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

CollectionSchema.pre("save", function (next) {
  if (this.rules) {
    this.rules.sort((a, b) => a.position - b.position);
  }
  next();
});

CollectionSchema.index({ name: 1 }, { unique: true });
CollectionSchema.index({ status: 1 });
CollectionSchema.index({ "rules.attribute": 1 });
CollectionSchema.index({ targetType: 1 });
CollectionSchema.index({ order: 1 });

export const Collection =
  mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);
