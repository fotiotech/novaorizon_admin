import { NextResponse } from "next/server";
import {
  getCartFunnel,
  getAbandonedCarts,
  getCartConversion,
  getHourlyEvents,
} from "@/lib/events/eventQueries";
import { requireAdminApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const [funnel, abandoned, conversion, hourly] = await Promise.all([
    getCartFunnel(),
    getAbandonedCarts(24 * 60 * 60 * 1000, 20),
    getCartConversion(10),
    getHourlyEvents(24),
  ]);
  return NextResponse.json({ funnel, abandoned, conversion, hourly });
}
