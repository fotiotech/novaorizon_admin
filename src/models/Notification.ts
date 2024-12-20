import { Schema, Types, model, models } from "mongoose";

const NotificationSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  // type: {
  //   type: String,
  //   enum: ["order", "payment", "promotion", "product"],
  //   required: true,
  // },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const Notification =
  models.Notification || model("Notification", NotificationSchema);

export default Notification;
