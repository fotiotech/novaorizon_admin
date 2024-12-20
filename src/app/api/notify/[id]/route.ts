"use server";

// /app/api/notifications/[id]/route.ts

import Notification from "@/models/Notification";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await Notification.findByIdAndUpdate(id, { isRead: true });
  return NextResponse.json({ status: "Notification marked as read" });
}
