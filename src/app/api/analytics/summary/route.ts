import { NextResponse } from "next/server";
import {
  getCartFunnel,
  getAbandonedCarts,
  getCartConversion,
  getHourlyEvents,
} from "@/lib/events/eventQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [funnel, abandoned, conversion, hourly] = await Promise.all([
    getCartFunnel(),
    getAbandonedCarts(24 * 60 * 60 * 1000, 20),
    getCartConversion(10),
    getHourlyEvents(24),
  ]);
  return NextResponse.json({ funnel, abandoned, conversion, hourly });
}
