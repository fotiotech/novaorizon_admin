// admin/lib/events/visitorQueries.ts
import { connection } from "@/utils/connection";
import { VisitorDay } from "@/models/VisitorDay";
import { DailyStats } from "@/models/DailyStats";

export type Period = "day" | "week" | "month";

export interface HistoryPoint {
  period: string; // "2026-09-27" | "2026-W39" | "2026-09"
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
  events: number;
  purchases: number;
  revenue: number;
}

function cutoffFor(period: Period, range: number): string {
  const d = new Date();
  if (period === "day") d.setUTCDate(d.getUTCDate() - range);
  if (period === "week") d.setUTCDate(d.getUTCDate() - range * 7);
  if (period === "month") d.setUTCMonth(d.getUTCMonth() - range);
  return d.toISOString().slice(0, 10);
}

function mongoFormat(period: Period): string {
  if (period === "day") return "%Y-%m-%d";
  if (period === "week") return "%G-W%V"; // ISO year-week
  return "%Y-%m";
}

export async function getVisitorHistory(
  period: Period,
  range: number,
): Promise<HistoryPoint[]> {
  await connection();

  const since = cutoffFor(period, range);
  const fmt = mongoFormat(period);

  // 1. Unique visitors per period — real dedup across days
  const visitorRows = await VisitorDay.aggregate<{
    _id: string;
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
  }>([
    { $match: { day: { $gte: since } } },
    {
      $group: {
        _id: {
          period: {
            $dateToString: {
              format: fmt,
              date: { $dateFromString: { dateString: "$day" } },
            },
          },
          userId: "$userId",
        },
      },
    },
    {
      $group: {
        _id: "$_id.period",
        visitors: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 2. Event/purchase/revenue totals per period
  const statRows = await DailyStats.aggregate<{
    _id: string;
    events: number;
    purchases: number;
    revenue: number;
    newVisitors: number;
    returningVisitors: number;
  }>([
    { $match: { day: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: fmt,
            date: { $dateFromString: { dateString: "$day" } },
          },
        },
        events: { $sum: "$events" },
        purchases: { $sum: "$eventCounts.purchase" },
        revenue: { $sum: "$revenue" },
        newVisitors: { $sum: "$newVisitors" },
        returningVisitors: { $sum: "$returningVisitors" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 3. Merge
  const map = new Map<string, HistoryPoint>();
  for (const v of visitorRows) {
    map.set(v._id, {
      period: v._id,
      visitors: v.visitors,
      newVisitors: 0,
      returningVisitors: 0,
      events: 0,
      purchases: 0,
      revenue: 0,
    });
  }
  for (const s of statRows) {
    const existing = map.get(s._id) ?? {
      period: s._id,
      visitors: 0,
      newVisitors: 0,
      returningVisitors: 0,
      events: 0,
      purchases: 0,
      revenue: 0,
    };
    existing.events = s.events;
    existing.purchases = s.purchases;
    existing.revenue = s.revenue;
    existing.newVisitors = s.newVisitors;
    existing.returningVisitors = s.returningVisitors;
    map.set(s._id, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );
}

// Quick stats for a header row: today / 7d / 30d / all-time
export async function getVisitorSummary() {
  await connection();

  const today = new Date().toISOString().slice(0, 10);
  const last7 = cutoffFor("day", 7);
  const last30 = cutoffFor("day", 30);

  async function uniqueVisitors(since?: string) {
    const match: any = {};
    if (since) match.day = { $gte: since };
    const [row] = await VisitorDay.aggregate([
      { $match: match },
      { $group: { _id: "$userId" } },
      { $count: "n" },
    ]);
    return row?.n ?? 0;
  }

  const [todayV, last7V, last30V, allTimeV] = await Promise.all([
    uniqueVisitors(today),
    uniqueVisitors(last7),
    uniqueVisitors(last30),
    uniqueVisitors(),
  ]);

  return { today: todayV, last7: last7V, last30: last30V, allTime: allTimeV };
}
