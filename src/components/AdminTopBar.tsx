// components/AdminTopBar.tsx
"use client";

import { Menu, Notifications, ExpandMore } from "@mui/icons-material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import axios from "axios";
import Pusher from "pusher-js";
import { ThemeToggle } from "./theme-toggle";
import { findNavContext } from "@/components/ui/menu-config";

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
  const pathname = usePathname();
  const router = useRouter();
  const nav = useMemo(() => findNavContext(pathname), [pathname]);

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [titleOpen, setTitleOpen] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  // ── Close title dropdown on outside click / Escape ────────────────
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (titleRef.current && !titleRef.current.contains(e.target as Node)) {
        setTitleOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTitleOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setTitleOpen(false);
  }, [pathname]);

  // ── Notifications ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notify`,
        { timeout: 10000 },
      );
      if (!Array.isArray(res.data)) {
        setNotifications([]);
        return;
      }
      setNotifications(res.data);
    } catch (err: any) {
      console.error(
        "[AdminTopBar] Failed to load notifications:",
        err?.response?.status,
        err?.response?.data ?? err?.message,
      );
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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

  const siblingCount = nav
    ? nav.siblings.filter((s) => s.href !== nav.current.href).length
    : 0;
  const hasMenu = siblingCount > 0;

  return (
    <header className="relative z-40 flex items-center justify-between gap-2 bg-background/80 pl-1 pr-3 lg:px-4 py-2 backdrop-blur-sm">
      {/* Left: menu toggle + page title (dropdown if section has siblings) */}
      <div className="flex min-w-0 items-center gap-2">
        <div className={screenSize >= 1024 ? "hidden" : ""}>
          <button
            title="Toggle menu"
            type="button"
            onClick={() => setSideBarToggle((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Menu sx={{ fontSize: 24 }} />
          </button>
        </div>

        {nav && (
          <div className="relative min-w-0" ref={titleRef}>
            {hasMenu ? (
              <button
                type="button"
                onClick={() => setTitleOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={titleOpen}
                className={`group -mx-2 flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                  titleOpen ? "bg-muted/60" : "hover:bg-muted/60"
                }`}
              >
                <h1 className="truncate text-base font-semibold text-foreground">
                  {nav.current.name}
                </h1>
                <ExpandMore
                  sx={{ fontSize: 18 }}
                  className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
                    titleOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            ) : (
              <h1 className="truncate text-base font-semibold text-foreground">
                {nav.current.name}
              </h1>
            )}

            {hasMenu && titleOpen && (
              <div
                role="menu"
                className="title-dropdown-enter absolute left-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
              >
                <div className="border-b border-border/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {nav.current.parentName ?? nav.current.sectionTitle}
                </div>

                <ul className="max-h-72 overflow-y-auto py-1">
                  {nav.siblings.map((s) => {
                    const isCurrent = s.href === nav.current.href;
                    return (
                      <li key={s.href}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            router.push(s.href);
                            setTitleOpen(false);
                          }}
                          aria-current={isCurrent ? "page" : undefined}
                          className={`group flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
                            isCurrent
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {s.icon && (
                            <span className="shrink-0 text-muted-foreground [&>svg]:text-base group-hover:text-foreground">
                              {s.icon}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate">
                            {s.name}
                          </span>
                          {isCurrent && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right cluster: theme + notifications */}
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex h-9 items-center">
          <ThemeToggle />
        </div>

        <Link
          href="/dashboard/notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Notifications sx={{ fontSize: 20 }} />
          {unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          )}
          <ToastContainer position="top-right" autoClose={3000} />
        </Link>
      </div>

      <style jsx>{`
        @keyframes titleDropdown {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .title-dropdown-enter {
          animation: titleDropdown 160ms cubic-bezier(0.22, 1, 0.36, 1) both;
          transform-origin: top left;
        }
      `}</style>
    </header>
  );
};

export default AdminTopBar;
