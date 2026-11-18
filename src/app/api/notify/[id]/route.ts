import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/server-api";

/** PATCH /api/notify/:id → backend PATCH /api/notifications/:id/read */

export async function PATCH(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;

    await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    });

    return NextResponse.json({ status: "Notification marked as read" });
  } catch (error: any) {
    console.error("[api/notify/:id] PATCH failed:", error);
    const status = error?.status === 404 ? 404 : 500;
    return NextResponse.json({ error: "Not found" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    await apiFetch(`/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/notify/:id] DELETE failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
