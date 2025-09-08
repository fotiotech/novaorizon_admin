// components/AdminTopBar.tsx
"use client";

import { Menu, Notifications } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSession } from "next-auth/react";
import { SignIn } from "./auth/SignInButton";

interface AdminTopBarProps {
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
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}: AdminTopBarProps) => {
  const session = useSession();
  const user = session?.data?.user as any;
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    // Simulated notifications fetch
    const fetchNotifications = async () => {
      // In a real app, you would fetch from your API
      const mockNotifications = [
        {
          _id: "1",
          message: "New order received",
          isRead: false,
          timestamp: new Date().toISOString(),
        },
        {
          _id: "2",
          message: "User signed up",
          isRead: false,
          timestamp: new Date().toISOString(),
        },
      ];
      setNotifications(mockNotifications);
    };

    fetchNotifications();
  }, []);

  return (
    <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md">
      <div className="flex items-center gap-3">
        <div className={`${screenSize >= 1024 ? "invisible" : ""}`}>
          <button
            title="button"
            type="button"
            onClick={() => setSideBarToggle((sideBarToggle) => !sideBarToggle)}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <div className="hidden md:block">
          <Link href={"/"}>
            <Image
              title="logo"
              src="/logo.png"
              width={40}
              height={30}
              alt="logo"
              className="w-auto h-auto"
            />
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href={"/notifications"} className="relative">
          <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
            <Notifications className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 -mt-1 -mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-xs text-white">
                  {notifications.length}
                </span>
              </span>
            )}
          </button>
          <ToastContainer position="top-right" autoClose={3000} />
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                {user?.email?.slice(0, 7)}...
              </p>
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-200 font-medium">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          ) : (
            <SignIn />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTopBar;
