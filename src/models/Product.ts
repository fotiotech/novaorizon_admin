import { esClient } from "@/app/lib/es";
import mongoose, { Schema } from "mongoose";
const ES_INDEX = process.env.ELASTIC_INDEX || "";

// Product Schema with a stable base contract while still allowing category-driven dynamic fields.
const ProductSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    sku: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
      index: true,
    },
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
    quantity: {
      type: Number,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    stock_status: {
      type: [String],
      default: ["Out of Stock"],
    },
    list_price: {
      type: Number,
      default: 0,
    },
    sale_price: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    main_image: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
    },
    short_description: {
      type: String,
      default: "",
    },
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
    },
    dsin: {
      type: String,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
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
