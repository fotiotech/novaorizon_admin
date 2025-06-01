import mongoose, { Schema } from "mongoose";

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
      productCode: {
        type: { type: String, required: true },
        value: { type: String, required: true },
      },
      name: { type: String, required: true },
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
      variant_type: { type: String }, // e.g., "size", "color"
      variants: [
        {
          option: { type: String },
          sku: { type: String },
          additional_price: { type: Number },
        },
      ],
      attributes: { type: Schema.Types.Mixed, default: {} },
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

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
