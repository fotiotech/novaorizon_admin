import { esClient } from "@/app/lib/es";
import mongoose, { Schema } from "mongoose";
const ES_INDEX = process.env.ELASTIC_INDEX || "";

// Core Product Schema treating all fields as grouped attributes
const ProductSchema = new Schema(
  {
    // Reference to the category/type determines attribute template
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    attributes: { type: Schema.Types.Mixed, default: {} },
  },

  {
    timestamps: true, // createdAt, updatedAt
  }
);

async function indexToES(doc: any) {
  try {
    await esClient.index({
      index: process.env.ELASTIC_INDEX || "",
      id: doc._id.toString(),
      document: {
        category_id: doc.category_id.toString(),
        attributes: doc.attributes || {},
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("ES index error:", err);
  }
}
ProductSchema.post("save", async function (doc) {
  await indexToES(doc);
});
ProductSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) await indexToES(doc);
});
ProductSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  try {
    await esClient.delete({ index: ES_INDEX, id: doc._id.toString() });
  } catch (err: any) {
    if (err?.meta?.body?.result !== "not_found")
      console.error("ES delete error:", err);
  }
});

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
