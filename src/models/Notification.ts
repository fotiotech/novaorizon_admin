import { Schema, Types, model, models } from "mongoose";

const NotificationSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["order", "payment", "promotion", "product", "system"],
    default: "system",
    index: true,
  },
  isRead: { type: Boolean, default: false, index: true },
  timestamp: { type: Date, default: Date.now },
});

// Compound index speeds up the "unread order count" query.
NotificationSchema.index({ isRead: 1, type: 1 });

const Notification =
  models.Notification || model("Notification", NotificationSchema);

export default Notification;
