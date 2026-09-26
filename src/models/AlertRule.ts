import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAlertRule extends Document {
  name: string;
  metric: "purchase_count" | "cart_abandon_rate" | "revenue" | "zero_traffic";
  window: number; // seconds
  threshold: number;
  comparator: "gt" | "lt";
  enabled: boolean;
  cooldown: number; // seconds
  lastFiredAt?: Date;
}

const AlertRuleSchema = new Schema<IAlertRule>({
  name: { type: String, required: true },
  metric: {
    type: String,
    enum: ["purchase_count", "cart_abandon_rate", "revenue", "zero_traffic"],
    required: true,
  },
  window: { type: Number, required: true },
  threshold: { type: Number, required: true },
  comparator: { type: String, enum: ["gt", "lt"], required: true },
  enabled: { type: Boolean, default: true },
  cooldown: { type: Number, default: 300 },
  lastFiredAt: Date,
});

export const AlertRule: Model<IAlertRule> =
  mongoose.models.AlertRule ||
  mongoose.model<IAlertRule>("AlertRule", AlertRuleSchema);
