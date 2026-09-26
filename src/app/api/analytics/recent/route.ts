import { NextRequest, NextResponse } from "next/server";
import { getEventsSince } from "@/lib/events/eventQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const since = Number(req.nextUrl.searchParams.get("since") ?? Date.now());
  const events = await getEventsSince(since, 50);
  return NextResponse.json(events);
}
