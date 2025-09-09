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
    // Convert the document to a plain object
    const docObject = doc.toObject ? doc.toObject() : doc;

    // Extract all fields except Mongoose internals
    const { _id, __v, createdAt, updatedAt, ...indexedFields } = docObject;

    await esClient.index({
      index: process.env.ELASTIC_INDEX || "",
      id: doc._id.toString(),
      document: {
        category_id: doc.category_id.toString(),
        ...indexedFields, // Spread all other fields
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("ES index error:", err);
  }
}

// Hooks for Elasticsearch indexing
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
