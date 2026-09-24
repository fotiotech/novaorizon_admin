// models/NewsletterSubscriber.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type NewsletterStatus = "subscribed" | "unsubscribed" | "bounced";

export interface NewsletterSubscriberDocument extends Document {
  email: string;
  status: NewsletterStatus;
  source: string;
  userId?: Types.ObjectId | null;
  unsubscribeToken: string;
  subscribedAt: Date;
  unsubscribedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<NewsletterSubscriberDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed", "bounced"],
      default: "subscribed",
      index: true,
    },
    source: { type: String, default: "footer" },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    unsubscribeToken: { type: String, required: true, index: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const NewsletterSubscriber: Model<NewsletterSubscriberDocument> =
  mongoose.models.NewsletterSubscriber ||
  mongoose.model<NewsletterSubscriberDocument>(
    "NewsletterSubscriber",
    NewsletterSubscriberSchema,
  );

export default NewsletterSubscriber;
