"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Users } from "@/constant/types";

type NotificationType = {
  _id: string;
  message: string;
  user?: Users;
  isRead: boolean;
  timestamp: string;
};

const NotificationPage = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notify`,
        { timeout: 10000 }
      );
      setNotifications(res.data);
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    await axios.patch(`/api/notify/${id}`);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <div className="">
      <h1 className="mb-4 text-2xl font-bold">Notifications</h1>
      <ul className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <li
            key={notification._id}
            onClick={() => markAsRead(notification._id)}
            className={`${
              notification.isRead ? "bg-slate-700" : "bg-slate-500"
            } flex items-center gap-3 p-2 border rounded-lg`}
          >
            <p>{notification?.user?.name}</p>
            {notification.message} -{" "}
            {new Date(notification.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationPage;
