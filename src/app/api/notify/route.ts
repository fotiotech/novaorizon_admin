"use server";

import Notification from "@/models/Notification";
import User from "@/models/users";
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
    const PAGE_SIZE = 10; // Limit to avoid overloading
    const notifications = await Notification.find()
      .sort({ timestamp: -1 })
      .limit(PAGE_SIZE);

    const userIds = notifications.map((notification) => notification.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = Object.fromEntries(
      users.map((user: any) => [user._id.toString(), user])
    );

    const notificationsWithUsers = notifications.map((notification) => ({
      ...notification.toObject(),
      user: userMap[notification.userId.toString()],
    }));

    return NextResponse.json(notificationsWithUsers);
  } catch (error: any) {
    console.error("Error fetching notifications or users:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch data." },
      { status: 500 }
    );
  }
}

// Your API route that triggers the event
export async function POST(request: Request) {
  const { userId, message } = await request.json();

  // Save the notification in the database
  const notification = new Notification({ userId, message });
  await notification.save();

  // Trigger an event on a channel
  pusher.trigger("admin-notifications", "new-notification", {
    message,
  });

  return NextResponse.json({ status: "Notification sent" });
}
