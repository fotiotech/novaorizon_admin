import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ICategoryProperty extends Document {
  name: string;
  description?: string;
  sets: {
    type: mongoose.Types.ObjectId;
    ref: "AttributeSet";
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CategoryPropertySchema = new Schema<ICategoryProperty>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    sets: [
      {
        type: Schema.Types.ObjectId,
        ref: "AttributeSet",
        required: true,
      },
    ],
  },
  { timestamps: true },
);

const CategoryProperty =
  models.CategoryProperty ||
  model<ICategoryProperty>("CategoryProperty", CategoryPropertySchema);

export default CategoryProperty;
