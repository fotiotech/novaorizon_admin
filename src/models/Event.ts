import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvent extends Document {
  userId: string;
  itemId: mongoose.Types.ObjectId; // required
  eventType: "view" | "cart_add" | "purchase" | "like" | "page_view";
  score: number;
  sessionId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    userId: { type: String, required: true, index: true },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: false,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["view", "cart_add", "purchase", "like", "page_view"],
      required: true,
    },
    score: { type: Number, default: 1 },
    sessionId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

EventSchema.index({ userId: 1, itemId: 1 });
EventSchema.index({ userId: 1, eventType: 1 });

export const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
