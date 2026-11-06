"use server";

// /app/api/notifications/[id]/route.ts

import Notification from "@/models/Notification";
import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  await connection();

  const params = await props.params;
  const { id } = params;
  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId: auth.user.id },
    { isRead: true },
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: "Notification marked as read" });
}
