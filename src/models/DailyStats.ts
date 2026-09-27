// front/models/DailyStats.ts  AND  admin/models/DailyStats.ts  (identical)
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyStats extends Document {
  day: string;
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
  events: number;
  eventCounts: {
    view: number;
    cart_add: number;
    purchase: number;
    like: number;
    page_view: number;
  };
  revenue: number;
  updatedAt: Date;
}

const DailyStatsSchema = new Schema<IDailyStats>({
  day: { type: String, required: true, unique: true },
  visitors: { type: Number, default: 0 },
  newVisitors: { type: Number, default: 0 },
  returningVisitors: { type: Number, default: 0 },
  events: { type: Number, default: 0 },
  eventCounts: {
    view: { type: Number, default: 0 },
    cart_add: { type: Number, default: 0 },
    purchase: { type: Number, default: 0 },
    like: { type: Number, default: 0 },
    page_view: { type: Number, default: 0 },
  },
  revenue: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

DailyStatsSchema.index({ day: -1 });

export const DailyStats: Model<IDailyStats> =
  mongoose.models.DailyStats ||
  mongoose.model<IDailyStats>("DailyStats", DailyStatsSchema);
