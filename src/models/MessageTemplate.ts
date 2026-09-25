// models/MessageTemplate.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MessageChannel = "email" | "sms";

export interface MessageTemplateDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  channel: MessageChannel;
  // Email-only
  subject?: string;
  previewText?: string;
  // Email body is HTML, SMS body is plain text.
  body: string;
  /** Names of variables the template references, e.g. ["firstName", "code"].
   *  Used for editor autocomplete and validation on save. */
  variables: string[];
  isActive: boolean;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageTemplateSchema = new Schema<MessageTemplateDocument>(
  {
    name: { type: String, required: true, trim: true },
    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
      index: true,
    },
    subject: { type: String, trim: true },
    previewText: { type: String, trim: true, maxlength: 200 },
    body: { type: String, required: true, default: "" },
    variables: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

MessageTemplateSchema.index({ channel: 1, isActive: 1, createdAt: -1 });

export const MessageTemplate: Model<MessageTemplateDocument> =
  mongoose.models.MessageTemplate ||
  mongoose.model<MessageTemplateDocument>(
    "MessageTemplate",
    MessageTemplateSchema,
  );

export default MessageTemplate;
