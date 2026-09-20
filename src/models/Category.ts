// models/Category.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

interface ICategory extends Document {
  slug: string;
  name: string;
  parentId?: mongoose.Types.ObjectId;
  description?: string;
  imageUrl?: string[];

  inheritProperty: boolean;

  // Admin's manual selection. Never touched by inheritance.
  property?: mongoose.Types.ObjectId;

  // Auto-generated merged snapshot. Populated only by Re-run.
  // Points at a CategoryProperty doc with `readOnly: true`.
  inheritedProperty?: mongoose.Types.ObjectId;

  seoTitle?: string;
  seoDesc?: string;
  keywords?: string;
  sortOrder?: number;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  slug: {
    type: String,
    unique: true,
    required: [true, "URL slug is required"],
  },
  name: {
    type: String,
    required: [true, "Category name is required"],
  },

  parentId: {
    type: mongoose.Types.ObjectId,
    ref: "Category",
  },
  description: { type: String, maxLength: 500 },
  imageUrl: [
    {
      type: String,
      validate: {
        validator: (v: string) => /^https?:\/\/.+\..+$/.test(v),
        message: (props: { value: string }) =>
          `${props.value} is not a valid URL!`,
      },
    },
  ],

  property: {
    type: Schema.Types.ObjectId,
    ref: "CategoryProperty",
  },

  inheritProperty: {
    type: Boolean,
    default: false,
  },

  inheritedProperty: {
    type: Schema.Types.ObjectId,
    ref: "CategoryProperty",
    default: null,
  },

  seoTitle: { type: String, maxLength: 60 },
  seoDesc: { type: String, maxLength: 160 },
  keywords: { type: String },
  sortOrder: { type: Number },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CategorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Category =
  models.Category || model<ICategory>("Category", CategorySchema);
export default Category;
