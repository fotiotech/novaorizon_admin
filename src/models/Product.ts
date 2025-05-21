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
    group_name: {
      type: String,
    },
    group_order: {
      type: String,
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },

  {
    timestamps: true, // createdAt, updatedAt
  }
);


const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
