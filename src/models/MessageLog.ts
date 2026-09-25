// models/MessageLog.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MessageChannel = "email" | "sms";

export type LogStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed"
  | "complained";

export interface MessageLogDocument extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  channel: MessageChannel;
  /** Target — email for email channel, phone for sms. */
  recipient: string;
  /** Optional link to a newsletter subscriber, when the recipient is one. */
  subscriberId?: Types.ObjectId | null;

  status: LogStatus;
  /** Provider-assigned message id (Resend `id`, Twilio `sid`). Used to
   *  match incoming webhook events back to this row. */
  providerMessageId?: string | null;
  providerName?: string | null;

  // Event timestamps — first occurrence wins.
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  openedAt?: Date | null;
  clickedAt?: Date | null;
  bouncedAt?: Date | null;
  failedAt?: Date | null;

  /** Provider error message on failure/bounce. */
  error?: string | null;
  /** Clicked/tracked link, when the provider reports it. */
  lastClickedUrl?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const MessageLogSchema = new Schema<MessageLogDocument>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "MessageCampaign",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
    },
    recipient: { type: String, required: true, trim: true, index: true },
    subscriberId: {
      type: Schema.Types.ObjectId,
      ref: "NewsletterSubscriber",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "queued",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "failed",
        "complained",
      ],
      default: "queued",
      index: true,
    },
    providerMessageId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    providerName: { type: String, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    clickedAt: { type: Date, default: null },
    bouncedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    error: { type: String, default: null },
    lastClickedUrl: { type: String, default: null },
  },
  { timestamps: true },
);

// A campaign should never send twice to the same recipient.
MessageLogSchema.index({ campaignId: 1, recipient: 1 }, { unique: true });

MessageLogSchema.index({ campaignId: 1, status: 1 });
MessageLogSchema.index({ campaignId: 1, createdAt: -1 });

export const MessageLog: Model<MessageLogDocument> =
  mongoose.models.MessageLog ||
  mongoose.model<MessageLogDocument>("MessageLog", MessageLogSchema);

export default MessageLog;
