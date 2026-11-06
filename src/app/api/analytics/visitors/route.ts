// admin/app/api/analytics/visitors/route.ts
import { NextResponse } from "next/server";
import { getVisitorSummary } from "@/lib/events/visitorQueries";
import { requireAdminApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const summary = await getVisitorSummary();
  return NextResponse.json(summary);
}
