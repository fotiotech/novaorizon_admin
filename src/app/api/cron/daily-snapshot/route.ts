// admin/app/api/cron/daily-snapshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connection } from "@/utils/connection";
import { Event } from "@/models/Event";
import { VisitorDay } from "@/models/VisitorDay";
import { DailyStats } from "@/models/DailyStats";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  await connection();

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const day = yesterday.toISOString().slice(0, 10);

  const next = new Date(yesterday);
  next.setUTCDate(next.getUTCDate() + 1);

  // Recompute from raw events to correct any drift
  const events = await Event.find({
    isBot: { $ne: true },
    timestamp: { $gte: yesterday, $lt: next },
  })
    .select("userId eventType metadata")
    .lean();

  const uniqueUsers = new Set<string>();
  const eventCounts: Record<string, number> = {};
  let revenue = 0;

  for (const e of events) {
    uniqueUsers.add(e.userId);
    eventCounts[e.eventType] = (eventCounts[e.eventType] ?? 0) + 1;
    if (e.eventType === "purchase" && (e.metadata as any)?.total) {
      revenue += Number((e.metadata as any).total) || 0;
    }
  }

  await DailyStats.updateOne(
    { day },
    {
      $set: {
        visitors: uniqueUsers.size,
        events: events.length,
        eventCounts: {
          view: eventCounts.view ?? 0,
          cart_add: eventCounts.cart_add ?? 0,
          purchase: eventCounts.purchase ?? 0,
          like: eventCounts.like ?? 0,
          page_view: eventCounts.page_view ?? 0,
        },
        revenue,
        updatedAt: new Date(),
      },
      $setOnInsert: { day, newVisitors: 0, returningVisitors: 0 },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true, day, visitors: uniqueUsers.size });
}
