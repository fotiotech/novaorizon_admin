// admin/app/api/analytics/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVisitorHistory, type Period } from "@/lib/events/visitorQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get("period") ?? "day") as Period;
  const range = Number(req.nextUrl.searchParams.get("range") ?? 30);

  const valid: Period[] = ["day", "week", "month"];
  if (!valid.includes(period)) {
    return NextResponse.json({ error: "invalid period" }, { status: 400 });
  }

  const points = await getVisitorHistory(period, range);
  return NextResponse.json({ period, range, points });
}
