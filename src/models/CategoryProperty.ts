import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ICategoryProperty extends Document {
  code: string;
  name: string;
  description?: string;
  mappings: {
    set: mongoose.Types.ObjectId;
    groups: {
      group: mongoose.Types.ObjectId;
      attributes: {
        attribute: mongoose.Types.ObjectId;
        isRequired: boolean;
      }[];
    }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CategoryPropertySchema = new Schema<ICategoryProperty>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    mappings: [
      {
        set: {
          type: Schema.Types.ObjectId,
          ref: "AttributeSet",
          required: true,
        },
        groups: [
          {
            group: {
              type: Schema.Types.ObjectId,
              ref: "AttributeGroup",
              required: true,
            },
            attributes: [
              {
                attribute: {
                  type: Schema.Types.ObjectId,
                  ref: "Attribute",
                  required: true,
                },
                isRequired: { type: Boolean, default: false },
              },
            ],
          },
        ],
      },
    ],
  },
  { timestamps: true },
);

const CategoryProperty =
  models.CategoryProperty ||
  model<ICategoryProperty>("CategoryProperty", CategoryPropertySchema);
export default CategoryProperty;
