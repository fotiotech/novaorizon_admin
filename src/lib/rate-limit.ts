import "server-only";
import mongoose, { Schema } from "mongoose";
import { headers } from "next/headers";
import { connection } from "@/utils/connection";

interface RateLimitDoc {
  key: string;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<RateLimitDoc>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit =
  (mongoose.models.RateLimit as mongoose.Model<RateLimitDoc>) ||
  mongoose.model<RateLimitDoc>("RateLimit", RateLimitSchema);

export async function getClientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return store.get("x-real-ip") ?? "unknown";
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number }> {
  try {
    await connection();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMs);

    const doc = await RateLimit.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    if (doc && doc.expiresAt < now) {
      await RateLimit.updateOne({ key }, { $set: { count: 1, expiresAt } });
      return { ok: true, remaining: limit - 1 };
    }

    const count = doc?.count ?? 0;
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    console.error("[rate-limit] failed:", error);
    return { ok: true, remaining: limit };
  }
}
