// components/AdminTopBar.tsx
"use client";

import { Menu, Notifications } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { useSession } from "next-auth/react";
import { SignIn } from "../app/(auth)/components/SignInButton";
import { useUnreadMessages } from "@/app/(customers)/customers/chat/_component/useUnreadMessages";
import axios from "axios";
import Pusher from "pusher-js";
import { ThemeToggle } from "./theme-toggle";

interface AdminTopBarProps {
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (param: (arg: boolean) => boolean) => void;
}

type NotificationType = {
  _id: string;
  message: string;
  type?: "order" | "payment" | "promotion" | "product" | "system";
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

  // ── Fetch the latest notifications ────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notify`,
        { timeout: 10000 },
      );

      if (!Array.isArray(res.data)) {
        console.error(
          "[AdminTopBar] Unexpected /api/notify response:",
          res.data,
        );
        setNotifications([]);
        return;
      }

      setNotifications(res.data);
    } catch (err: any) {
      console.error(
        "[AdminTopBar] Failed to load notifications:",
        err?.response?.status,
        err?.response?.data ?? err?.message,
        "URL:",
        `${process.env.NEXT_PUBLIC_API_URL}/api/notify`,
      );
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Real-time updates via Pusher ──────────────────────────────────
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
    });

    const channel = pusher.subscribe("admin-notifications");
    channel.bind(
      "new-notification",
      (data: {
        id?: string;
        message: string;
        type?: NotificationType["type"];
        timestamp?: string;
      }) => {
        setNotifications((prev) => {
          const next: NotificationType = {
            _id:
              data.id ??
              `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            message: data.message,
            type: data.type ?? "system",
            isRead: false,
            timestamp: data.timestamp ?? new Date().toISOString(),
          };
          return [next, ...prev];
        });
      },
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("admin-notifications");
      pusher.disconnect();
    };
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className={`${screenSize >= 1024 ? "invisible" : ""}`}>
          <button
            title="Toggle menu"
            type="button"
            onClick={() => setSideBarToggle((sideBarToggle) => !sideBarToggle)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-card/70 px-2.5 py-1.5 shadow-sm">
          <Link href={"/"} className="flex items-center gap-2">
            <Image
              title="logo"
              src="/logo.png"
              width={36}
              height={26}
              alt="logo"
              className="h-auto w-auto"
            />
            <span className="text-sm font-semibold text-foreground">
              NovaOrizon
            </span>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <ThemeToggle />

        <Link href={"/dashboard/notifications"} className="relative">
          <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <Notifications className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </button>
          <ToastContainer position="top-right" autoClose={3000} />
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-2 py-1.5 shadow-sm">
              <p className="hidden text-sm font-medium text-foreground sm:block">
                {user?.email?.slice(0, 7)}...
              </p>
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                <Link href={`/profile/`}>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unreadCount}
                    </span>
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
    </header>
  );
};

export default AdminTopBar;
