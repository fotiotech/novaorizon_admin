import mongoose, { Schema, Model } from "mongoose";

export interface IMenu {
  name: string;
  description?: string;
  image?: string;
  // NEW: reference to a Collection (content source)
  collectionId?: mongoose.Types.ObjectId;
  // Optional direct link (for static pages, external URLs, etc.)
  link?: string;

  // --- Display & Layout ---
  location?: "Banner" | "NavBar" | "SideBar" | "Home" | "Section" | "Footer";
  display: "List" | "Grid" | "Carousel" | "Dropdown" | "MegaMenu";
  position?: "left" | "center" | "right" | "full";
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
  order?: number;

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
    image: {
      type: String,
      trim: true,
    },
    // --- Content Source ---
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
    },
    link: {
      type: String,
      trim: true,
    },
    // --- Location ---
    location: {
      type: String,
      enum: ["Banner", "NavBar", "SideBar", "Home", "Section", "Footer"],
    },
    // --- Display ---
    display: {
      type: String,
      enum: ["List", "Grid", "Carousel", "Dropdown", "MegaMenu"],
      required: [true, "Display type is required"],
    },
    position: {
      type: String,
      enum: ["left", "center", "right", "full"],
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
    // --- Styling ---
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
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

MenuSchema.index({ name: "text", description: "text" });
MenuSchema.index({ location: 1, order: 1 });

export const Menu: Model<IMenu> =
  mongoose.models.Menu || mongoose.model<IMenu>("Menu", MenuSchema);
