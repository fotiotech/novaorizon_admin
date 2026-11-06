import Notification from "@/models/Notification";
import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    await connection();
    const body = await request.json().catch(() => ({}));
    const { type } = body as { type?: string };

    const query: Record<string, unknown> = {
      userId: auth.user.id,
      isRead: false,
    };
    if (type) query.type = type;

    const result = await Notification.updateMany(query, {
      $set: { isRead: true },
    });
    return NextResponse.json({ status: "ok", modified: result.modifiedCount });
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
