// app/notifications/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Pusher from "pusher-js";
import {
  Notifications as NotificationsIcon,
  NotificationsOff,
  DoneAll,
  ShoppingBag,
  Payment,
  Campaign,
  Inventory2,
  Info,
} from "@mui/icons-material";
import { Users } from "@/constant/types";
import toast from "react-hot-toast";

type NotificationType = {
  _id: string;
  message: string;
  type?: "order" | "payment" | "promotion" | "product" | "system";
  user?: Users;
  isRead: boolean;
  timestamp: string;
};

const typeIcon = (type?: NotificationType["type"]) => {
  switch (type) {
    case "order":
      return <ShoppingBag fontSize="small" />;
    case "payment":
      return <Payment fontSize="small" />;
    case "promotion":
      return <Campaign fontSize="small" />;
    case "product":
      return <Inventory2 fontSize="small" />;
    default:
      return <Info fontSize="small" />;
  }
};

const typeToHref = (type?: NotificationType["type"]) => {
  switch (type) {
    case "order":
      return "/sales/orders";
    case "payment":
      return "/sales/orders";
    case "promotion":
      return "/marketing/promotions";
    case "product":
      return "/catalog/products";
    default:
      return "/dashboard/notifications";
  }
};

const typeStyles: Record<string, string> = {
  order:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  payment:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  promotion:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
  product:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  system:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
};

const NotificationPage = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notify`,
        { timeout: 10000 },
      );

      if (!Array.isArray(res.data)) {
        console.error("[notifications] Unexpected response shape:", res.data);
        throw new Error(
          res.data?.error ?? "Unexpected response from /api/notify",
        );
      }

      setNotifications(res.data);
    } catch (err: any) {
      console.error(
        "[notifications] Failed to load:",
        err?.response?.status,
        err?.response?.data ?? err?.message,
      );
      toast.error("Couldn't load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Real-time ─────────────────────────────────────────────────────
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
        setNotifications((prev) => [
          {
            _id:
              data.id ??
              `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            message: data.message,
            type: data.type ?? "system",
            isRead: false,
            timestamp: data.timestamp ?? new Date().toISOString(),
          },
          ...prev,
        ]);
      },
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("admin-notifications");
      pusher.disconnect();
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    try {
      // Uses your existing /api/notify/[id]/route.ts
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/notify/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllRead = async () => {
    try {
      // Bulk endpoint lives under /api/notifications to avoid clashing
      // with the /api/notify/[id] dynamic route.
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/mark-all-read`,
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const visible = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications,
    [filter, notifications],
  );

  return (
    <div className="mx-auto w-full max-w-4xl py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${
                  unreadCount === 1 ? "" : "s"
                }`
              : "You're all caught up."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DoneAll fontSize="small" />
            Mark all read
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-5 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {filter === "unread" ? (
              <DoneAll className="text-muted-foreground" />
            ) : (
              <NotificationsOff className="text-muted-foreground" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter === "unread"
              ? "You're all caught up."
              : "We'll let you know when something happens."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((notification) => {
            const type = notification.type ?? "system";
            const badgeCls = typeStyles[type] ?? typeStyles.system;
            return (
              <li key={notification._id}>
                <Link
                  href={typeToHref(type)}
                  onClick={() => {
                    if (!notification.isRead) markAsRead(notification._id);
                  }}
                  className={`group flex items-start gap-3 rounded-xl border p-3 transition ${
                    notification.isRead
                      ? "border-border bg-card/60 hover:bg-muted/60"
                      : "border-primary/20 bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full ring-1 ring-inset ${badgeCls}`}
                  >
                    {typeIcon(type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm ${
                          notification.isRead
                            ? "text-muted-foreground"
                            : "font-medium text-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      {!notification.isRead && (
                        <span className="mt-1 h-2 w-2 flex-none rounded-full bg-primary" />
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {notification?.user?.name && (
                        <span className="font-medium text-foreground">
                          {notification.user.name}
                        </span>
                      )}
                      <span className="capitalize">{type}</span>
                      <span>•</span>
                      <span>
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NotificationPage;
