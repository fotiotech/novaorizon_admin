import { NextRequest, NextResponse } from "next/server";
import { getHotRightNow } from "@/lib/events/eventQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const minutes = Number(req.nextUrl.searchParams.get("window") ?? 15);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 8);
  const items = await getHotRightNow(minutes * 60 * 1000, limit);
  return NextResponse.json({ items, windowMinutes: minutes });
}
