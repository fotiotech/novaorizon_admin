import mongoose, { Schema, model, models, Document } from "mongoose";

// Nested trust-badge shape
export interface ITrustBadge {
  icon: string;
  title: string;
  description?: string;
  popupText?: string;
  link?: string;
}

// Define the interface for the HeroContent document
export interface IHeroContent extends Document {
  title: string;
  description: string;
  imageUrl: string;
  cta_text: string;
  cta_link: string;
  trustBadges: ITrustBadge[];
  created_at: Date;
  updated_at: Date;
}

const TrustBadgeSchema = new Schema<ITrustBadge>(
  {
    icon: {
      type: String,
      required: [true, "Badge icon is required"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Badge title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    popupText: {
      type: String,
      default: "",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // optional
          // Allow absolute URLs (http/https/ftp) and internal paths (/...)
          return (
            /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v) || v.startsWith("/")
          );
        },
        message: "Link must be a valid URL or start with /",
      },
    },
  },
  { _id: false }, // embedded — no separate _id needed
);

const HeroContentSchema = new Schema<IHeroContent>({
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
  },
  imageUrl: {
    type: String,
    required: [true, "At least one image is required"],
  },
  cta_text: {
    type: String,
    required: [true, "CTA text is required"],
  },
  cta_link: {
    type: String,
    required: [true, "CTA link is required"],
    validate: {
      validator: function (v: string) {
        return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
      },
      message: "Invalid URL format",
    },
  },
  trustBadges: {
    type: [TrustBadgeSchema],
    default: [],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update the updated_at field before saving
HeroContentSchema.pre<IHeroContent>("save", function (next) {
  this.updated_at = new Date();
  next();
});

const HeroContent =
  models.HeroContent || model<IHeroContent>("HeroContent", HeroContentSchema);

export default HeroContent;
