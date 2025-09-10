import mongoose, { Schema, Document } from "mongoose";

const ruleSchema = new Schema({
  attribute: {
    type: String,
    required: [true, "Rule attribute is required"],
  },
  operator: {
    type: String,
    enum: ["$in", "$nin", "$eq", "$ne", "$lt", "$lte", "$gt", "$gte"],
    required: [true, "Rule operator is required"],
  },
  value: {
    type: Schema.Types.Mixed,
    required: [true, "Rule value is required"],
  },
  position: {
    type: Number,
    required: true,
    min: [0, "Position must be non-negative"],
  },
});

const productCollectionSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Collection name is required"],
      unique: true,
    },
    description: {
      type: String,
    },
    display: {
      type: String,
      enum: ["grid", "carousel", "category"],
      default: "grid",
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
    },
    rules: [ruleSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Ensure rules are ordered by position
productCollectionSchema.pre("save", function (next) {
  if (this.rules) {
    this.rules.sort((a, b) => a.position - b.position);
  }
  next();
});

// Indexes for better query performance
productCollectionSchema.index({ name: 1 });
productCollectionSchema.index({ category_id: 1 });
productCollectionSchema.index({ status: 1 });
productCollectionSchema.index({ "rules.attribute": 1 });
productCollectionSchema.index({ "rules.position": 1 });

export const ProductCollection =
  mongoose.models.ProductCollection ||
  mongoose.model("ProductCollection", productCollectionSchema);
