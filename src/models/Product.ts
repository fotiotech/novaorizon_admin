import { Schema, model, models } from "mongoose";
import { VariantAttribute } from "./VariantAttributes";
import { Variant } from "./Variant";

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
      required: [true, "Base price is required"],
      min: [0, "Base price must be a positive number"],
    },
    taxRate: {
      type: Number,
      default: 0, // Optional: Default tax rate (percentage)
    },
    finalPrice: {
      type: Number,
      required: [true, "Final price is required"],
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

ProductSchema.pre("findOneAndDelete", async function (next) {
  const productId = this.getQuery()._id;
  await Variant.deleteMany({ product_id: productId });
  await VariantAttribute.deleteMany({ product_id: productId });
  next();
});

const Product = models.Product || model("Product", ProductSchema);

export default Product;
