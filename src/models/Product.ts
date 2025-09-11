import { esClient } from "@/app/lib/es";
import mongoose, { Schema } from "mongoose";
const ES_INDEX = process.env.ELASTIC_INDEX || "";

// Product Schema with flat field structure
const ProductSchema = new Schema(
  {
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    // Add related_products field definition
    related_products: {
      ids: [
        {
          type: Schema.Types.ObjectId,
          ref: "Product",
          default: [],
        },
      ],
      relationship_type: {
        type: String,
      },
      // You can add other fields like 'title', 'position', etc. if needed
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    strict: false, // Allow dynamic fields
  }
);

async function indexToES(doc: any) {
  try {
    // Check if Elasticsearch client is connected
    if (!esClient) {
      throw new Error("Elasticsearch client not initialized");
    }

    // Convert the document to a plain object
    const docObject = doc.toObject ? doc.toObject() : doc;

    // Extract all fields except Mongoose internals
    const { _id, __v, createdAt, updatedAt, ...indexedFields } = docObject;

    await esClient.index({
      index: process.env.ELASTIC_INDEX || "novaorizonsearch",
      id: doc._id.toString(),
      body: {
        category_id: doc.category_id.toString(),
        ...indexedFields,
        createdAt: doc.createdAt,
      },
    });

    console.log("Successfully indexed document to Elasticsearch");
  } catch (err) {
    console.error("ES index error details:", err);
    // Add retry logic here if needed
  }
}

// Hooks for Elasticsearch indexing - corrected version
ProductSchema.post("save", async function (doc) {
  await indexToES(doc);
});

ProductSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) await indexToES(doc);
});

ProductSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  try {
    await esClient.delete({
      index: process.env.ELASTIC_INDEX || "",
      id: doc._id.toString(),
    });
  } catch (err: any) {
    if (err?.meta?.body?.result !== "not_found") {
      console.error("ES delete error:", err);
    }
  }
});

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
