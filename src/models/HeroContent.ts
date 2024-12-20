import mongoose, { Schema, model, models } from "mongoose";

const HeroContentSchema = new Schema({
  title: { type: String },
  description: {
    type: String,
  },
  imageUrl: {
    type: String,
    unique: true,
    required: [true, "image url is required"],
  },
  cta_text: {
    type: String,
  },
  cta_link: {
    type: String,
    unique: true,
  },
  created_at: {
    type: String,
    default: Date.now,
  },
  updated_at: {
    type: String,
    default: Date.now,
  },
});

const HeroContent =
  models.HeroContent || model("HeroContent", HeroContentSchema);

export default HeroContent;
