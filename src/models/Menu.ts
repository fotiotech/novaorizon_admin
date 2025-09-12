// models/Menu.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMenu extends Document {
  name: string;
  description?: string;
  collections: mongoose.Types.ObjectId[];
  ctaUrl?: string;
  ctaText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MenuSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Menu name is required"],
      trim: true,
      maxlength: [100, "Menu name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    collections: [
      {
        type: Schema.Types.ObjectId,
        ref: "Collection",
      },
    ],
    ctaUrl: {
      type: String,
      trim: true,
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: [50, "CTA text cannot exceed 50 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Create text index for search functionality
MenuSchema.index({ name: "text", description: "text" });

// Check if the model already exists to prevent overwriting
export const Menu: Model<IMenu> =
  mongoose.models.Menu || mongoose.model<IMenu>("Menu", MenuSchema);
