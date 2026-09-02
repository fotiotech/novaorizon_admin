import mongoose, { Schema, model, models, Document } from "mongoose";

// Category Interface
interface ICategory extends Document {
  slug: string;
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  description?: string;
  imageUrl?: string[];
  property?: mongoose.Types.ObjectId; // Reference to CategoryProperty
  inheritProperty: boolean;
  seoTitle?: string;
  seoDesc?: string;
  keywords?: string;
  sortOrder?: number;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// Category Schema
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
    default: true,
  },
  seoTitle: { type: String, maxLength: 60 },
  seoDesc: { type: String, maxLength: 160 },
  keywords: { type: String },
  sortOrder: { type: Number },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update `updatedAt` on save
CategorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Category Model
const Category =
  models.Category || model<ICategory>("Category", CategorySchema);
export default Category;
