import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/server-api";

/** PATCH /api/notifications/mark-all-read → backend read-all. */

export async function PATCH(_request: Request) {
  try {
    const res = await apiFetch<{ data?: { updated?: number } }>(
      "/notifications/read-all",
      { method: "PATCH" },
    );

    return NextResponse.json({
      status: "ok",
      modified: res?.data?.updated ?? 0,
    });
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
