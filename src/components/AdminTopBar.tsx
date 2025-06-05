'use client'

import { useUser } from "@/app/context/UserContext";
import {
  Menu,
  NotificationAddRounded,
  NotificationsSharp,
  Person,
} from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import Pusher from "pusher-js";
import React, { LegacyRef, useEffect, useState } from "react";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import { useSession } from "next-auth/react";
import { SignIn } from "./auth/SignInButton";

interface adminTopBarProps {
  domNode?: LegacyRef<HTMLDivElement>;
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (param: (arg: boolean) => boolean) => void;
}

type NotificationType = {
  _id: string;
  message: string;
  isRead: boolean;
  timestamp: string;
};

const AdminTopBar = ({
  domNode,
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}: adminTopBarProps) => {
  const session = useSession();
  const user = session?.data?.user as any;
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    // Initialize Pusher client
    const pusher = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_APP_KEY as string,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER as string,
      }
    );

    // Subscribe to a channel
    const channel = pusher.subscribe("admin-notifications");

    // Listen for 'new-notification' events
    channel.bind("new-notification", (data: { message: string }) => {
      // Show notification with React Toastify
      toast.success(data.message);
    });

    async function fetchNotifications() {
      try {
        // Fetch notifications from the API
        const result = await axios.get("/api/notify");

        // Validate that data is an array
        if (Array.isArray(result.data)) {
          // Filter unread notifications
          const isNotReadNotification = result.data.filter(
            (res: NotificationType) => !res.isRead // Use `!res.isRead` for clarity
          );

          // Update state with unread notifications
          setNotifications(isNotReadNotification);
        } else {
          console.error("Unexpected data format from API:", result.data);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    }

    fetchNotifications();

    // Cleanup when component unmounts
    return () => {
      pusher.unsubscribe("admin-notifications");
    };
  }, []);

  return (
    <div
      className="flex justify-between items-center p-2 shadow mb-4
    dark:bg-pri-dark"
    >
      <div className="flex items-center gap-3 ">
        <div className={`${screenSize >= 1024 ? "invisible" : ""} `}>
          <span
            onClick={() => setSideBarToggle((sideBarToggle) => !sideBarToggle)}
            className=" "
          >
            <Menu style={{ fontSize: 30 }} />
          </span>
        </div>
        <div>
          <Link href={"/"}>
            <Image
              title="logo"
              src="/logo.png"
              width={60}
              height={40}
              alt="logo"
              className=" w-auto h-auto"
            />
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href={"/notifications"} className="relative">
          <NotificationsSharp />
          <ToastContainer />
          <span
            className="absolute top-0 left-0 bg-red-500 
          rounded-full text-xs px-1"
          >
            {notifications.length}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {user ? <p className="font-bold">{user?.email.slice(0,7)}...</p> : <SignIn />}

          <Person style={{ fontSize: 30 }} />
        </div>
      </div>
    </div>
  );
};

export default AdminTopBar;
