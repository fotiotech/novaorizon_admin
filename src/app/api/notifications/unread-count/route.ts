import Notification from "@/models/Notification";
import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    await connection();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const query: Record<string, unknown> = {
      userId: auth.user.id,
      isRead: false,
    };
    if (type) query.type = type;

    const count = await Notification.countDocuments(query);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to count notifications:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
