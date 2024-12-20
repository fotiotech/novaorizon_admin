import mongoose, { Schema, model, models } from "mongoose";

const SessionSchema = new Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    unique: [true],
    required: [true],
  },
  expiresAt: {
    type: Date,
    required: [true],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_ad: {
    type: Date,
  },
});

const Session = models.Session || model("Session", SessionSchema);

export default Session;
