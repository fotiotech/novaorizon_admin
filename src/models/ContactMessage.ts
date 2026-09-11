// models/ContactMessage.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ContactMessageDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<ContactMessageDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "read", "replied", "archived"],
      default: "new",
    },
    userId: { type: String, default: null },
  },
  { timestamps: true },
);

const ContactMessage: Model<ContactMessageDocument> =
  mongoose.models.ContactMessage ||
  mongoose.model<ContactMessageDocument>(
    "ContactMessage",
    ContactMessageSchema,
  );

export default ContactMessage;
