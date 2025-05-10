import mongoose, { Schema, Document, model } from "mongoose";

export type EventType = 'view' | 'click' | 'add_to_cart' | 'purchase';

export interface IUserEvent extends Document {
  user_id: string;            // Reference to user.user_id
  product_id: string;         // Reference to product.product_id
  event_type: EventType;
  timestamp: Date;
  device?: string;            // e.g., mobile, desktop
  location?: string;          // e.g., Douala, Yaoundé
  metadata?: Record<string, any>; // Optional extra data (e.g., price at purchase)
}

const UserEventSchema = new Schema<IUserEvent>(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    product_id: {
      type: String,
      required: true,
      index: true,
    },
    event_type: {
      type: String,
      enum: ['view', 'click', 'add_to_cart', 'purchase'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    device: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet'],
    },
    location: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Optional: compound index to improve query performance
UserEventSchema.index({ user_id: 1, product_id: 1, event_type: 1 });

const UserEvent = model<IUserEvent>("UserEvent", UserEventSchema);

export default UserEvent;
