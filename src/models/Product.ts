// models/Product.js

import mongoose, { Schema } from "mongoose";




// Core Product Schema treating all fields as attributes
const ProductSchema = new Schema(
  {
    // Reference to the category/type determines attribute template
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sku: {type: String},
    title: {type: String},
    price: {type: String},
    brand: {type: Schema.Types.ObjectId, ref:'Brand'},
    department: {type: String},
    short_desc: {type: String},
    media: {type: [String]},
    fields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    stock_quantity: {type: Number},
    low_stock_threshold: {type: Number},
    stock_status: {type: String},
    last_inventory_update: {type: Date},

  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Example: index a few hot fields nested inside groups
ProductSchema.index({ "fields.sku": 1 });
ProductSchema.index({ "fields.title": 1 });
ProductSchema.index({ "fields.price": 1 });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;