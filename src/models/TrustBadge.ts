// models/TrustBadge.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import { BADGE_ICON_VALUES, isValidBadgeLink } from "@/lib/trust/badgeIcons";

export interface ITrustBadgeDoc extends Document {
  name: string; // internal admin label ("Secure payment")
  icon: string; // BadgeIconName
  title: string; // customer-facing ("Secure Payment")
  description?: string;
  popupText?: string;
  link?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrustBadgeSchema = new Schema<ITrustBadgeDoc>(
  {
    name: {
      type: String,
      required: [true, "Internal name is required"],
      trim: true,
      maxlength: 80,
    },
    icon: {
      type: String,
      required: [true, "Icon is required"],
      enum: {
        values: BADGE_ICON_VALUES,
        message: "Unknown icon",
      },
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 60,
    },
    description: { type: String, default: "", trim: true, maxlength: 160 },
    popupText: { type: String, default: "", trim: true, maxlength: 600 },
    link: {
      type: String,
      default: "",
      trim: true,
      validate: {
        validator: (v: string) => isValidBadgeLink(v),
        message: "Link must be a valid URL or start with /",
      },
    },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

TrustBadgeSchema.index({ isActive: 1, sortOrder: 1 });

const TrustBadge =
  models.TrustBadge || model<ITrustBadgeDoc>("TrustBadge", TrustBadgeSchema);

export default TrustBadge;
