// models/Menu.ts
import mongoose, { Schema, Model } from "mongoose";

export interface IMenu {
  // --- Core Identity ---
  name: string;
  description?: string;
  image?: string; // Icon or thumbnail for the menu item

  // --- Content Linking ---
  content: mongoose.Types.ObjectId[]; // Child menu items or referenced documents
  ctaUrl?: string; // Direct link override (e.g., /sale)
  ctaText?: string; // Button text inside the menu item

  // --- Categorization ---
  type:
    | "Category"
    | "Product"
    | "Brand"
    | "Collection"
    | "Promotion"
    | "MegaMenu"
    | "URL" // Custom external/internal link
    | "Search"
    | "Page"; // Static pages (About, Contact)

  location?: "Banner" | "NavBar" | "SiderBar" | "Home" | "Section" | "Footer";

  // --- Layout & Rendering (Crucial for Ecommerce) ---
  display: "List" | "Grid" | "Carousel" | "Dropdown" | "MegaMenu";

  position?: "left" | "center" | "right" | "full"; // Mega-menu alignment
  columns?: number; // Max 6, for mega-menu grid layout
  maxDepth?: number; // How many levels of nesting are allowed (1-5)
  showImages?: boolean; // Toggle product/category images in dropdown

  // --- Styling Hooks ---
  backgroundColor?: string; // Hex or CSS color
  backgroundImage?: string; // Optional background banner
  isSticky?: boolean; // Pin to top on scroll
  sectionTitle?: string; // Heading for the menu block
  order?: number;
  // --- Timestamps ---
  createdAt: Date;
  updatedAt: Date;
}

const MenuSchema: Schema = new Schema(
  {
    // Core
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

    // Content & CTAs
    content: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    ctaUrl: {
      type: String,
      trim: true,
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: [50, "CTA text cannot exceed 50 characters"],
    },

    // Enums (Updated)
    type: {
      type: String,
      enum: [
        "Category",
        "Product",
        "Brand",
        "Collection",
        "Promotion",
        "MegaMenu",
        "URL",
        "Search",
        "Page",
      ],
      required: [true, "Menu type is required"],
    },
    location: {
      type: String,
      enum: ["Banner", "NavBar", "SideBar", "Home", "Section", "Footer"],
    },
    display: {
      type: String,
      enum: ["List", "Grid", "Carousel", "Dropdown", "MegaMenu"],
      required: [true, "Display type is required"],
    },

    // Layout & Mega-menu configs
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

    // Styling
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

// Text index for searching menu items
MenuSchema.index({ name: "text", description: "text" });

export const Menu: Model<IMenu> =
  mongoose.models.Menu || mongoose.model<IMenu>("Menu", MenuSchema);
