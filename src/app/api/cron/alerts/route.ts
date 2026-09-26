import { NextRequest, NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/events/alertEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const fires = await evaluateAlerts();
  return NextResponse.json({ ok: true, fires });
}
