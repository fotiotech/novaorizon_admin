"use server";

import Notification from "@/models/Notification";
import User from "@/models/User";
import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID as string,
  key: process.env.PUSHER_APP_KEY as string,
  secret: process.env.PUSHER_APP_SECRET as string,
  cluster: process.env.PUSHER_APP_CLUSTER as string,
  useTLS: true,
});

export async function GET() {
  try {
    await connection();
    const PAGE_SIZE = 10;
    const notifications = await Notification.find()
      .sort({ timestamp: -1 })
      .limit(PAGE_SIZE)
      .lean();

    const userIds = notifications.map((n) => n.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = Object.fromEntries(
      users.map((u: any) => [u._id.toString(), u]),
    );

    const notificationsWithUsers = notifications.map((n) => ({
      ...n,
      user: userMap[n.userId.toString()],
    }));

    return NextResponse.json(notificationsWithUsers);
  } catch (error: any) {
    console.error("Error fetching notifications or users:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch data." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await connection();
    const { userId, message, type = "system" } = await request.json();

    const notification = new Notification({ userId, message, type });
    await notification.save();

    // Broadcast to the admin channel — the client hook listens on this.
    await pusher.trigger("admin-notifications", "new-notification", {
      id: notification._id.toString(),
      userId,
      message,
      type,
      timestamp: notification.timestamp,
    });

    return NextResponse.json({ status: "Notification sent" });
  } catch (error: any) {
    console.error("Failed to send notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 },
    );
  }
}
