import { Schema, model, models } from "mongoose";

const ProductSchema = new Schema(
  {
    url_slug: {
      type: String,
      unique: true,
      required: [true, "URL slug is required"],
      trim: true,
    },
    dsin: {
      type: String,
      unique: true,
      required: [true, "DSIN is required"],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
      required: [true, "Product name is required"],
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
    },
    brand_id: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Brand ID is required"],
    },
    department: {
      type: String,
      trim: true,
      required: [true, "Department is required"],
    },
    description: {
      type: String,
      trim: true,
    },
    basePrice: {
      type: Number,
      required: [false, "Base price is required"],
      min: [0, "Base price must be a positive number"],
    },
    taxRate: {
      type: Number,
      default: 0, // Optional: Default tax rate (percentage)
    },
    finalPrice: {
      type: Number,
      required: [false, "Final price is not required for now!"],
      min: [0, "Final price must be a positive number"],
    },
    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        required: false,
      },
      value: {
        type: Number,
        min: [0, "Discount value cannot be negative"],
        required: false,
      },
    },
    currency: {
      type: String,
      default: "XAF", // Default currency (Central African CFA Franc)
    },
    // productCode: {
    //   type: Object,
    //   // unique: true,
    //   sparse: true, // Optional but unique if present
    //   trim: true,
    // },

    stockQuantity: {
      type: Number,
      // required: [true, "Stock quantity is required"],
      min: [0, "Stock quantity cannot be negative"],
    },
    imageUrls: {
      type: [String],
      required: [true, "At least one image URL is required"],
    },
    attributes: [
      {
        groupName: {
          type: String,
          required: true,
          trim: true,
        },
        attributes: {
          type: Map,
          of: [String], // Each attribute maps to an array of string values
          required: true,
        },
      },
    ],

    variantAttributes: {
      type: Map,
      of: {
        type: Map,
        of: [String], // Each attribute group maps to attribute names, which map to arrays of string values
      },
      default: {}, // Default to an empty object
    },

    variants: {
      type: [
        {
          Color: { type: String, required: false }, // Example attribute
          Sizes: { type: String, required: false }, // Example attribute
          variantName: { type: String, default: "" },
          sku: { type: String, required: true },
          basePrice: {
            type: Number,
            required: true,
            min: [0, "Base price must be positive"],
          },
          finalPrice: {
            type: Number,
            required: true,
            min: [0, "Final price must be positive"],
          },
          taxRate: { type: Number, default: 0 },
          discount: { type: Number, default: 0 },
          currency: { type: String, default: "XAF" },
          stockQuantity: {
            type: Number,
            required: true,
            min: [0, "Stock quantity cannot be negative"],
          },
          imageUrls: { type: [String], default: [] },
          status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
          },
        },
      ],
      default: [], // Default to an empty array
    },
    offerId: {
      type: Schema.Types.ObjectId,
      ref: "Offer",
      required: false, // Nullable, in case the product has no active offer
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    step: {
      type: Number,
      default: 1, // Step tracking for wizard-like forms
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Product = models.Product || model("Product", ProductSchema);

export default Product;
