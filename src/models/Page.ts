import mongoose, { Schema, Document, Model } from "mongoose";

// ----------------------------------------------
// 1. Define the Page interface (extends Document)
// ----------------------------------------------
export interface IPage extends Document {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string; // URL or cloudinary ID
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  status: "draft" | "review" | "published" | "archived";
  publishedAt?: Date;
  author?: mongoose.Types.ObjectId | string; // reference to User
  tags?: string[];
  category?: string;
  views?: number;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------
// 2. Define the Schema
// ----------------------------------------------
const PageSchema = new Schema<IPage>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [100, "Slug too long"],
    },
    excerpt: {
      type: String,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    featuredImage: {
      type: String,
      default: "",
    },
    metaTitle: {
      type: String,
      maxlength: [60, "Meta title should be under 60 characters"],
      default: "",
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description should be under 160 characters"],
      default: "",
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "review", "published", "archived"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      default: "",
    },
    views: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ----------------------------------------------
// 3. Pre‑save hook – auto‑generate slug if missing
// ----------------------------------------------
PageSchema.pre<IPage>("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  // If status changes to 'published' and publishedAt is not set, set it now
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }
  next();
});

// ----------------------------------------------
// 4. Model singleton
// ----------------------------------------------
const PageModel: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>("Page", PageSchema);

export default PageModel;
