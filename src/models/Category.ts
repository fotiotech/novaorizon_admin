import mongoose, { Schema, model, models, Document } from "mongoose";

// Category Interface
interface ICategory extends Document {
  url_slug: string;
  categoryName: string;
  parent_id?: mongoose.Types.ObjectId;
  description?: string;
  imageUrl?: string[];
  seo_title?: string;
  seo_desc?: string;
  keywords?: string;
  sort_order?: number;
  status: "active" | "inactive";
  created_at: Date;
  updated_at: Date;
}

// Category Schema
const CategorySchema = new Schema<ICategory>({
  url_slug: {
    type: String,
    unique: true,
    required: [true, "URL slug is required"],
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  categoryName: {
    type: String,
    unique: true,
    required: [true, "Category name is required"],
  },
  parent_id: {
    type: mongoose.Types.ObjectId,
    ref: "Category",
  },
  description: { type: String, maxLength: 500 },
  imageUrl: [
    {
      type: String,
      validate: {
        validator: (v: string) => /^https?:\/\/.+\..+$/.test(v),
        message: (props: { value: string }) => `${props.value} is not a valid URL!`,
      },
    },
  ],
  seo_title: { type: String, maxLength: 60 },
  seo_desc: { type: String, maxLength: 160 },
  keywords: { type: String },
  sort_order: { type: Number },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Update `updated_at` on save
CategorySchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Category Model
const Category = models.Category || model<ICategory>("Category", CategorySchema);
export default Category;
