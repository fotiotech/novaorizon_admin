// models/MessageCampaign.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MessageChannel = "email" | "sms";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "failed"
  | "cancelled";

/** Audience filter — picks which subscribers this campaign targets. */
export interface CampaignAudience {
  /** Only subscribers with this status. "subscribed" is the default and
   *  the only safe choice for production sends. */
  status: "subscribed" | "unsubscribed" | "bounced" | "all";
  /** Filter by subscription source, e.g. "footer" / "checkout". */
  sources?: string[];
  /** Only subscribers created after this date. */
  joinedAfter?: Date | null;
  /** Only subscribers created before this date. */
  joinedBefore?: Date | null;
  /** Explicit include/exclude by email (useful for tests). */
  includeEmails?: string[];
  excludeEmails?: string[];
}

export interface CampaignStats {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
}

export interface MessageCampaignDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  channel: MessageChannel;

  // Snapshot of content — copied from a template at compose time so
  // editing the template later doesn't retroactively change sent
  // campaigns.
  subject?: string;
  previewText?: string;
  body: string;

  audience: CampaignAudience;
  status: CampaignStatus;
  scheduledFor?: Date | null;

  /** Progress cursor for a partially-sent campaign. Lets a large send
   *  be resumed across multiple requests without re-sending anyone. */
  progress: {
    /** Last subscriber `_id` that was processed. Empty on first run. */
    lastSubscriberId: string | null;
    /** How many the current run has attempted. */
    processed: number;
    /** When the last batch ran. */
    lastRunAt: Date | null;
    /** Non-fatal error message from the last batch. */
    lastError: string | null;
  };

  stats: CampaignStats;

  // Source template, if composed from one — kept for reporting.
  templateId?: Types.ObjectId | null;

  createdBy?: Types.ObjectId | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignAudienceSchema = new Schema<CampaignAudience>(
  {
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed", "bounced", "all"],
      default: "subscribed",
    },
    sources: { type: [String], default: [] },
    joinedAfter: { type: Date, default: null },
    joinedBefore: { type: Date, default: null },
    includeEmails: { type: [String], default: [] },
    excludeEmails: { type: [String], default: [] },
  },
  { _id: false },
);

const CampaignStatsSchema = new Schema<CampaignStats>(
  {
    total: { type: Number, default: 0, min: 0 },
    queued: { type: Number, default: 0, min: 0 },
    sent: { type: Number, default: 0, min: 0 },
    delivered: { type: Number, default: 0, min: 0 },
    opened: { type: Number, default: 0, min: 0 },
    clicked: { type: Number, default: 0, min: 0 },
    bounced: { type: Number, default: 0, min: 0 },
    failed: { type: Number, default: 0, min: 0 },
    unsubscribed: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const ProgressSchema = new Schema(
  {
    lastSubscriberId: { type: String, default: null },
    processed: { type: Number, default: 0 },
    lastRunAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { _id: false },
);

const MessageCampaignSchema = new Schema<MessageCampaignDocument>(
  {
    name: { type: String, required: true, trim: true },
    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
      index: true,
    },
    subject: { type: String, trim: true },
    previewText: { type: String, trim: true },
    body: { type: String, required: true, default: "" },
    audience: {
      type: CampaignAudienceSchema,
      default: () => ({ status: "subscribed" }),
    },
    status: {
      type: String,
      enum: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "paused",
        "failed",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },
    scheduledFor: { type: Date, default: null, index: true },
    progress: { type: ProgressSchema, default: () => ({}) },
    stats: { type: CampaignStatsSchema, default: () => ({}) },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "MessageTemplate",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

MessageCampaignSchema.index({ status: 1, createdAt: -1 });
MessageCampaignSchema.index({ status: 1, scheduledFor: 1 });

export const MessageCampaign: Model<MessageCampaignDocument> =
  mongoose.models.MessageCampaign ||
  mongoose.model<MessageCampaignDocument>(
    "MessageCampaign",
    MessageCampaignSchema,
  );

export default MessageCampaign;
