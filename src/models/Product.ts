// models/Product.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Sub-schema to represent grouped attributes
const GroupSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    fields: {
      // All product properties are dynamic attributes
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

// Core Product Schema treating all fields as attributes
const ProductSchema = new Schema(
  {
    // Reference to the category/type determines attribute template
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Dynamic, grouped attributes container
    groups: {
      type: [GroupSchema],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Example: index a few hot fields nested inside groups
ProductSchema.index({ "groups.fields.sku": 1 });
ProductSchema.index({ "groups.fields.name": 1 });
ProductSchema.index({ "groups.fields.price": 1 });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;