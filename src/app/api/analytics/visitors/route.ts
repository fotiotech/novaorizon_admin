// admin/app/api/analytics/visitors/route.ts
import { NextResponse } from "next/server";
import { getVisitorSummary } from "@/lib/events/visitorQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getVisitorSummary();
  return NextResponse.json(summary);
}
