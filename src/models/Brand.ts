import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IBrand extends Document {
  _id: string;
  url_slug?: string;
  name: string;
  logoUrl?: string;
  status: "active" | "inactive";
}

const BrandSchema = new Schema<IBrand>({
  url_slug: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple `null` values without triggering a unique constraint
  },
  name: {
    type: String,
    required: [true, "Brand name is required"],
    unique: true,
  },
  logoUrl: {
    type: String,
    validate: {
      validator: (v: string) => /^https?:\/\/.+\..+$/.test(v),
      message: "Invalid URL format",
    },
    unique: true,
    sparse: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
});

const Brand = models.Brand || mongoose.model<IBrand>("Brand", BrandSchema);
export default Brand;
