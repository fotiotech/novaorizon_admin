import mongoose, { Schema, model, models, Document } from "mongoose";

// Define the interface for the HeroContent document
export interface IHeroContent extends Document {
  title: string;
  description: string;
  imageUrl: string;
  cta_text: string;
  cta_link: string;
  created_at: Date;
  updated_at: Date;
}

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
