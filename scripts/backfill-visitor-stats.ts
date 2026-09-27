// admin/scripts/backfill-visitor-stats.ts

// ─── 1. Load env BEFORE anything that reads process.env ───
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFiles = [".env.local", ".env.development", ".env"];
for (const file of envFiles) {
  const full = resolve(process.cwd(), file);
  if (existsSync(full)) {
    config({ path: full });
    console.log(`[env] loaded ${file}`);
  }
}

if (!process.env.MONGODB_URI) {
  console.error(
    "❌ MONGODB_URI is not set. Add it to admin/.env.local or run with:\n" +
      '   MONGODB_URI="mongodb+srv://..." npx tsx scripts/backfill-visitor-stats.ts',
  );
  process.exit(1);
}

// ─── 2. Everything else ───
import { connection } from "@/utils/connection";
import { Event } from "@/models/Event";
import { DailyStats } from "@/models/DailyStats";
import { VisitorDay } from "@/models/VisitorDay";
import mongoose from "mongoose";

async function main() {
  await connection();

  console.log("🗑  clearing VisitorDay and DailyStats…");
  await VisitorDay.deleteMany({});
  await DailyStats.deleteMany({});

  const totalEvents = await Event.countDocuments({ isBot: { $ne: true } });
  console.log(`📊 backfilling from ${totalEvents} events…`);

  const cursor = Event.find({ isBot: { $ne: true } })
    .sort({ timestamp: 1 })
    .select("userId eventType metadata timestamp")
    .lean()
    .cursor();

  let processed = 0;
  let lastReport = Date.now();

  for await (const e of cursor) {
    const ts = new Date(e.timestamp as any);
    const day = ts.toISOString().slice(0, 10);

    // Upsert today's visitor row (unique index makes this idempotent)
    const visitorResult = await VisitorDay.updateOne(
      { day, userId: e.userId },
      { $setOnInsert: { day, userId: e.userId, firstSeenAt: ts } },
      { upsert: true },
    );

    const isFirstToday = visitorResult.upsertedCount > 0;

    // Was this user seen on any earlier day?
    let isReturning = false;
    if (isFirstToday) {
      const prior = await VisitorDay.findOne({
        userId: e.userId,
        day: { $lt: day },
      })
        .select("_id")
        .lean();
      isReturning = !!prior;
    }

    // Build the increment payload
    const inc: Record<string, number> = {
      events: 1,
      [`eventCounts.${e.eventType}`]: 1,
    };
    if (isFirstToday) {
      inc.visitors = 1;
      if (isReturning) inc.returningVisitors = 1;
      else inc.newVisitors = 1;
    }
    if (e.eventType === "purchase" && (e.metadata as any)?.total) {
      const total = Number((e.metadata as any).total);
      if (Number.isFinite(total)) inc.revenue = total;
    }

    await DailyStats.updateOne(
      { day },
      {
        $inc: inc,
        $set: { updatedAt: new Date() },
        $setOnInsert: { day },
      },
      { upsert: true },
    );

    processed++;
    if (Date.now() - lastReport > 3000) {
      console.log(`   …${processed}/${totalEvents}`);
      lastReport = Date.now();
    }
  }

  console.log(`✅ backfill complete: ${processed} events processed`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ backfill failed:", err);
  process.exit(1);
});
