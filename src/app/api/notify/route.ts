import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/server-api";

/**
 * Thin proxy to the Express backend's notification API.
 *
 * GET  → GET  /api/notifications        (the caller's inbox)
 * POST → POST /api/notifications/send   (notify every admin)
 */

export async function GET() {
  try {
    const res = await apiFetch<{ data?: { notifications?: unknown[] } }>(
      "/notifications",
      { query: { limit: 10 } },
    );

    return NextResponse.json(res?.data?.notifications ?? []);
  } catch (error) {
    console.error("[api/notify] GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const kind = String(body?.type ?? body?.kind ?? "system");

    const res = await apiFetch("/notifications/send", {
      method: "POST",
      body: { kind, message },
    });

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[api/notify] POST failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to send notification" },
      { status: 500 },
    );
  }
}
