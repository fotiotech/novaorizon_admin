// models/Menu.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMenu extends Document {
  name: string;
  description?: string;
  collections: mongoose.Types.ObjectId[];
  ctaUrl?: string;
  ctaText?: string;
  type: string;
  position?: string;
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
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
    type: {
      type: String,
      enum: [
        "navigation",
        "header",
        "section",
        "footer",
        "category",
        "promotional",
      ],
      default: "navigation",
    },
    position: {
      type: String,
      trim: true,
    },
    columns: {
      type: Number,
      min: 1,
      max: 6,
      default: 4,
    },
    maxDepth: {
      type: Number,
      min: 1,
      max: 5,
      default: 2,
    },
    showImages: {
      type: Boolean,
      default: false,
    },
    backgroundColor: {
      type: String,
      trim: true,
      default: "#ffffff",
    },
    backgroundImage: {
      type: String,
      trim: true,
    },
    isSticky: {
      type: Boolean,
      default: false,
    },
    sectionTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Section title cannot exceed 100 characters"],
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
