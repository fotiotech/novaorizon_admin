// front/models/VisitorDay.ts  AND  admin/models/VisitorDay.ts  (identical)
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVisitorDay extends Document {
  day: string; // "2026-09-27"
  userId: string;
  firstSeenAt: Date;
}

const VisitorDaySchema = new Schema<IVisitorDay>({
  day: { type: String, required: true },
  userId: { type: String, required: true },
  firstSeenAt: { type: Date, default: Date.now },
});

// Primary: ensure uniqueness per day
VisitorDaySchema.index({ day: 1, userId: 1 }, { unique: true });
// Secondary: "have we seen this user on any prior day?"
VisitorDaySchema.index({ userId: 1, day: 1 });

export const VisitorDay: Model<IVisitorDay> =
  mongoose.models.VisitorDay ||
  mongoose.model<IVisitorDay>("VisitorDay", VisitorDaySchema);
