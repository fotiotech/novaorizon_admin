// components/AdminTopBar.tsx
"use client";

import { Menu, Notifications } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useSession } from "next-auth/react";
import { SignIn } from "../app/(auth)/components/SignInButton";
import { useUnreadMessages } from "@/app/(customers)/customers/chat/_component/useUnreadMessages";
import axios from "axios";
import { ThemeToggle } from "./theme-toggle";

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
  const unreadCount = useUnreadMessages();
  const user = session?.data?.user as any;
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notify`,
        { timeout: 10000 },
      );
      setNotifications(res.data);
    };

    fetchNotifications();
  }, []);

  return (
    <div className="flex justify-between items-center p-4 bg-background border-b border-border shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`${screenSize >= 1024 ? "invisible" : ""}`}>
          <button
            title="button"
            type="button"
            onClick={() => setSideBarToggle((sideBarToggle) => !sideBarToggle)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
        <ThemeToggle />
        <Link href={"/notifications"} className="relative">
          <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            <Notifications className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 -mt-1 -mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/75"></span>
                <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-destructive text-destructive-foreground text-xs">
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
              <p className="font-medium text-foreground hidden sm:block">
                {user?.email?.slice(0, 7)}...
              </p>
              <div className="relative h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                <Link href={`/profile/`}>
                  {unreadCount > 0 && (
                    <p className="absolute right-0 -top-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1 min-w-[18px] text-center">
                      {unreadCount}
                    </p>
                  )}
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </Link>
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
