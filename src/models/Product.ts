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

    /* Identification & Branding */
    identification_branding: {
      product_code: {
        type: { type: String, },
        value: { type: String, required: true, unique: true },
      },
      name: { type: String, required: true, unique: true },
      brand: { type: Schema.Types.ObjectId, ref: "Brand" },
      manufacturer: { type: String },
      // dynamic/custom entries
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Product Specifications */
    product_specifications: {
      weight: { type: Number },
      dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
        unit: { type: String, default: "cm" },
      },
      color: { type: String },
      technical_specs: { type: Schema.Types.Mixed, default: {} },

      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Media & Visuals */
    media_visuals: {
      main_image: { type: String },
      gallery: [{ type: String }],
      videos: [{ type: String }],
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Pricing & Availability */
    pricing_availability: {
      price: { type: Number, required: true },
      currency: { type: String, default: "USD" },
      cost: { type: Number },
      msrp: { type: Number },
      stock_status: {
        type: String,
        enum: ["in_stock", "out_of_stock", "backorder"],
      },
      quantity: { type: Number, default: 0 },
      backorder: { type: Boolean, default: false },
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Variants & Options */
    variants_options: {
      variant_theme: { type: String }, // e.g., "size", "color"
      variants: [
        { type: Schema.Types.Mixed, default: {} },
      ],
      
    },

    /* Key Features & Bullets */
    key_features: [{ type: String }],
    bullets: [{ type: String }],
    attributes: { type: Schema.Types.Mixed, default: {} },

    /* Descriptions */
    descriptions: {
      short: { type: String },
      long: { type: String },
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Related Products */
    related_products: [
      {
        product_id: { type: Schema.Types.ObjectId, ref: "Product" },
        relationship_type: { type: String }, // e.g., "similar", "accessory"
      },
    ],

    /* Materials & Composition */
    materials_composition: {
      primary_material: { type: String },
      secondary_material: { type: String },
      composition_details: { type: String },
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Logistics & Shipping */
    logistics_shipping: {
      shipping_weight: { type: Number },
      shipping_dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
        unit: { type: String, default: "cm" },
      },
      origin_country: { type: String },
      shipping_class: { type: String },
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Warranty & Returns */
    warranty_returns: {
      warranty_period: { type: String },
      return_policy: { type: String },
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Reviews & Ratings */
    reviews_ratings: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        created_at: { type: Date, default: Date.now },
      },
    ],
    ratings_summary: {
      average: { type: Number },
      count: { type: Number },
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* SEO & Marketing Metadata */
    seo_marketing: {
      meta_title: { type: String },
      meta_description: { type: String },
      meta_keywords: [{ type: String }],
      marketing_tags: [{ type: String }],
      attributes: { type: Schema.Types.Mixed, default: {} },
    },

    /* Legal & Compliance */
    legal_compliance: {
      safety_certifications: [{ type: String }],
      country_restrictions: [{ type: String }],
      compliance_documents: [{ type: String }],
      attributes: { type: Schema.Types.Mixed, default: {} },
    },
  },

  {
    timestamps: true, // createdAt, updatedAt
  }
);

ProductSchema.post("save", async function (doc) {
  try {
    await esClient.index({
      index: ES_INDEX,
      id: doc._id.toString(),
      body: {
        name: doc.identification_branding?.name,
        description: doc.descriptions?.long || doc.descriptions?.short || "",
        price: doc.pricing_availability?.price,
        category_id: doc.category_id.toString(),
        brand: doc.identification_branding?.brand?.toString() || null,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("ES index error (save):", err);
  }
});

ProductSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;
  try {
    await esClient.index({
      index: ES_INDEX,
      id: doc._id.toString(),
      body: {
        name: doc.identification_branding.name,
        description: doc.descriptions?.long || doc.descriptions?.short || "",
        price: doc.pricing_availability.price,
        category_id: doc.category_id.toString(),
        brand: doc.identification_branding.brand?.toString() || null,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("ES index error (update):", err);
  }
});

ProductSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  try {
    await esClient.delete({
      index: ES_INDEX,
      id: doc._id.toString(),
    });
  } catch (err: any) {
    if (err?.meta?.body?.result !== "not_found")
      console.error("ES delete error:", err);
  }
});

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
