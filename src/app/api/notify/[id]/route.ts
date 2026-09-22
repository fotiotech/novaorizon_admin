"use server";

// /app/api/notifications/[id]/route.ts

import Notification from "@/models/Notification";
import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  await connection();

  const params = await props.params;
  const { id } = params;
  await Notification.findByIdAndUpdate(id, { isRead: true });
  return NextResponse.json({ status: "Notification marked as read" });
}
