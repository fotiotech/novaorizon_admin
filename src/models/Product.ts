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
      sku: { type: String, required: true },
      name: { type: String, required: true },
      brand: { type: String },
      manufacturer: { type: String },
      model_number: { type: String },
      // dynamic/custom entries
      attributes: [
        {
          key: { type: String, required: true },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Product Specifications */
    product_specifications: {
      weight: { type: Number },
      dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
        unit: { type: String, default: 'cm' },
      },
      color: { type: String },
      technical_specs: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
      attributes: [
        {
          key: { type: String, required: true },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Media & Visuals */
    media_visuals: {
      main_image: { type: String },
      gallery: [{ type: String }],
      videos: [{ type: String }],
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Pricing & Availability */
    pricing_availability: {
      price: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
      cost: { type: Number },
      msrp: { type: Number },
      stock_status: { type: String, enum: ['in_stock', 'out_of_stock', 'backorder'] },
      quantity: { type: Number, default: 0 },
      backorder: { type: Boolean, default: false },
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
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
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Key Features & Bullets */
    key_features: [{ type: String }],
    bullets: [{ type: String }],
    features_attributes: [
      {
        key: { type: String },
        value: Schema.Types.Mixed,
      },
    ],

    /* Descriptions */
    descriptions: {
      short: { type: String },
      long: { type: String },
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Materials & Composition */
    materials_composition: {
      primary_material: { type: String },
      secondary_material: { type: String },
      composition_details: { type: String },
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Logistics & Shipping */
    logistics_shipping: {
      shipping_weight: { type: Number },
      shipping_dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
        unit: { type: String, default: 'cm' },
      },
      origin_country: { type: String },
      shipping_class: { type: String },
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Warranty & Returns */
    warranty_returns: {
      warranty_period: { type: String },
      return_policy: { type: String },
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Reviews & Ratings */
    reviews_ratings: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        created_at: { type: Date, default: Date.now },
      },
    ],
    ratings_summary: {
      average: { type: Number },
      count: { type: Number },
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* SEO & Marketing Metadata */
    seo_marketing: {
      meta_title: { type: String },
      meta_description: { type: String },
      meta_keywords: [{ type: String }],
      marketing_tags: [{ type: String }],
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },

    /* Legal & Compliance */
    legal_compliance: {
      safety_certifications: [{ type: String }],
      country_restrictions: [{ type: String }],
      compliance_documents: [{ type: String }],
      attributes: [
        {
          key: { type: String },
          value: Schema.Types.Mixed,
        },
      ],
    },
  },

  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
