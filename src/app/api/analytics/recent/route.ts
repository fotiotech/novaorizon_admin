// admin/app/api/analytics/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEventsSince } from "@/lib/events/eventQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const since = Number(req.nextUrl.searchParams.get("since") ?? Date.now());
  const events = await getEventsSince(since, 100);
  return NextResponse.json(events, {
    headers: { "Cache-Control": "no-store, must-revalidate" },
  });
}
