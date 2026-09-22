"use server";

import Notification from "@/models/Notification";
import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await connection();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const query: Record<string, unknown> = { isRead: false };
    if (type) query.type = type;

    const count = await Notification.countDocuments(query);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to count notifications:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
