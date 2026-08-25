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
    // NEW: type of collection
    type: {
      type: String,
      enum: ["rule", "manual"],
      default: "rule",
    },
    // NEW: target model ("Product" or "Collection")
    targetType: {
      type: String,
      enum: ["Product", "Collection"],
      default: "Product",
    },
    // NEW: manually selected items (dynamic ref)
    items: [
      {
        type: Schema.Types.ObjectId,
        refPath: "targetType", // dynamic reference
      },
    ],
    rules: [ruleSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// Pre-save hook to sort rules
CollectionSchema.pre("save", function (next) {
  if (this.rules) {
    this.rules.sort((a, b) => a.position - b.position);
  }
  next();
});

// Indexes
CollectionSchema.index({ name: 1 });
CollectionSchema.index({ status: 1 });
CollectionSchema.index({ "rules.attribute": 1 });
CollectionSchema.index({ targetType: 1 });

export const Collection =
  mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);
