// admin/app/api/cron/daily-snapshot/route.ts
//
// Thin proxy to the Express job (`POST /api/cron/daily-snapshot`). Vercel cron
// keeps calling this URL; the backend owns the aggregation.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const API_BASE = (
  process.env.SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (!authorization) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/cron/daily-snapshot`, {
      method: "POST",
      headers: { authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    console.error("[cron/daily-snapshot] proxy failed:", error);
    return NextResponse.json({ error: "Snapshot failed" }, { status: 502 });
  }
}
