import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEventRollup extends Document {
  bucket: Date;
  eventType: "view" | "cart_add" | "purchase" | "like" | "page_view";
  itemId: mongoose.Types.ObjectId | null;
  count: number;
  totalScore: number;
  uniqueUsers: string[];
}

const EventRollupSchema = new Schema<IEventRollup>({
  bucket: { type: Date, required: true },
  eventType: { type: String, required: true },
  itemId: { type: Schema.Types.ObjectId, default: null },
  count: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  uniqueUsers: { type: [String], default: [] },
});

EventRollupSchema.index(
  { bucket: 1, eventType: 1, itemId: 1 },
  { unique: true },
);
EventRollupSchema.index({ bucket: 1, itemId: 1 });
EventRollupSchema.index({ bucket: 1, eventType: 1 });

export const EventRollup: Model<IEventRollup> =
  mongoose.models.EventRollup ||
  mongoose.model<IEventRollup>("EventRollup", EventRollupSchema);
