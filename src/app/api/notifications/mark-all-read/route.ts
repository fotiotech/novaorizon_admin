"use server";

import Notification from "@/models/Notification";
import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    await connection();
    const body = await request.json().catch(() => ({}));
    const { type } = body as { type?: string };

    const query: Record<string, unknown> = { isRead: false };
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
