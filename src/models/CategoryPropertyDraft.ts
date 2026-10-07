// models/CategoryPropertyDraft.ts
import mongoose, { Schema, Model } from "mongoose";

export interface ICategoryPropertyDraft {
  key: string;
  userId: string | null;
  version: number;
  data: any;
  savedAt: Date;
}

const CategoryPropertyDraftSchema = new Schema<ICategoryPropertyDraft>(
  {
    key: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true },
    version: { type: Number, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One draft per (key, user). `userId: null` scopes to unauthenticated / single-tenant.
CategoryPropertyDraftSchema.index({ key: 1, userId: 1 }, { unique: true });

// Auto-expire drafts after 30 days — avoids an unbounded collection
// without needing a cron job.
CategoryPropertyDraftSchema.index(
  { savedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);

const CategoryPropertyDraft: Model<ICategoryPropertyDraft> =
  (mongoose.models.CategoryPropertyDraft as Model<ICategoryPropertyDraft>) ||
  mongoose.model<ICategoryPropertyDraft>(
    "CategoryPropertyDraft",
    CategoryPropertyDraftSchema,
  );

export default CategoryPropertyDraft;
