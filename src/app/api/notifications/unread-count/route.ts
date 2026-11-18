import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/server-api";

/** GET /api/notifications/unread-count?type=… → backend unread inbox. */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const res = await apiFetch<{
      data?: { notifications?: Array<{ type?: string; isRead?: boolean }> };
    }>("/notifications", { query: { unread: true, limit: 100 } });

    const items = res?.data?.notifications ?? [];
    const count = items.filter(
      (n) => !n.isRead && (!type || n.type === type),
    ).length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to count notifications:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
