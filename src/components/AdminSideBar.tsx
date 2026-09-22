// components/AdminSideBar.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Assignment,
  BarChart,
  Category,
  Chat,
  Code,
  Discount,
  Email,
  GetAppRounded,
  Inventory,
  Inventory2,
  LocalShipping,
  Person2,
  Replay,
  Settings,
  ShoppingBag,
  Tag,
  Segment,
  Campaign,
  Assessment,
  BarChart as BarChartIcon,
} from "@mui/icons-material";
import { useUnreadMessages } from "@/app/(customers)/customers/chat/_component/useUnreadMessages";
import { useNewContactCount } from "@/hooks/useNewContactCount";
import LeftSheet from "@/components/ux/LeftSheet";
import { useUnreadOrderNotifications } from "@/app/(dashboard)/dashboard/notifications/_component/hooks/useUnreadOrderNotifications";

export interface MenuLink {
  name: string;
  href: string;
  icon?: React.ReactNode;
  showUnreadCount?: boolean;
  showContactCount?: boolean;
  showOrderCount?: boolean;
  absolute?: boolean;
}

export interface MenuSection {
  title: string;
  slug: string;
  links: MenuLink[];
}

interface AdminSideBarProps {
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (open: boolean) => void;
}

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const rawMenuConfig = [
  {
    title: "Analytics",
    links: [
      { name: "Sales Analytics", href: "/sales_reports", icon: <Assessment /> },
      {
        name: "Customer Analytics",
        href: "/customer_report",
        icon: <BarChart />,
      },
      {
        name: "Inventory Reports",
        href: "/inventory_reports",
        icon: <Inventory />,
      },
    ],
  },
  {
    title: "Sales",
    links: [
      {
        name: "Orders",
        href: "/orders",
        icon: <ShoppingBag />,
        showOrderCount: true,
      },
      { name: "Fulfillment", href: "/fulfillment", icon: <LocalShipping /> },
      { name: "Refunds", href: "/refunds", icon: <Replay /> },
    ],
  },
  {
    title: "Catalog",
    links: [
      { name: "Products", href: "/products", icon: <Inventory2 /> },
      { name: "Category", href: "/categories", icon: <Category /> },
      { name: "Brands", href: "/brands", icon: <Tag /> },
      { name: "Attributes", href: "/attributes", icon: <Assignment /> },
      { name: "Inventory", href: "/inventory", icon: <Inventory /> },
    ],
  },
  {
    title: "Customers",
    links: [
      { name: "Customers", href: "/customers", icon: <Person2 /> },
      { name: "Segmentation", href: "/segmentation", icon: <Segment /> },
      { name: "Messages", href: "/messages", icon: <Assignment /> },
      { name: "Chat", href: "/chat", icon: <Chat />, showUnreadCount: true },
    ],
  },
  {
    title: "Marketing",
    links: [
      { name: "Merchandising", href: "/content", icon: <Code /> },
      { name: "Campaigns", href: "/campaigns", icon: <Discount /> },
      { name: "Promotions", href: "/promotions", icon: <Discount /> },
      { name: "Email Marketing", href: "/email_marketing", icon: <Email /> },
      { name: "Affiliate Marketing", href: "/affiliate", icon: <Code /> },
      { name: "SEO", href: "/seo", icon: <Code /> },
    ],
  },
  {
    title: "Channels",
    links: [
      { name: "Store", href: "/store", icon: <Campaign /> },
      { name: "POS", href: "/pos", icon: <GetAppRounded /> },
    ],
  },
];

const menuConfig: MenuSection[] = rawMenuConfig.map((section) => {
  const slug = slugify(section.title);
  const links = section.links.map((link) => {
    let newHref = link.href;
    const prefix = `/${slug}`;
    if (!newHref.startsWith(prefix)) newHref = `${prefix}${newHref}`;
    return { ...link, href: newHref };
  });
  return { ...section, slug, links };
});

const settingsLink: MenuLink = { name: "Settings", href: "/settings" };

const AdminSideBar: React.FC<AdminSideBarProps> = ({
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}) => {
  const pathname = usePathname();
  const unreadCount = useUnreadMessages();
  const newContactCount = useNewContactCount();
  const { count: unreadOrderCount } = useUnreadOrderNotifications();

  // Expanded state — collapsed by default; the header row is always clickable.
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    menuConfig.forEach((section) => {
      initial[section.title] = true;
    });
    return initial;
  });

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Same close behaviour used everywhere inside the sidebar.
  const handleClose = () => {
    if (screenSize <= 1024) setSideBarToggle(false);
  };

  const isLargeScreen = screenSize > 1024;

  // ── Inner content — shared between the desktop sidebar and the mobile sheet ──
  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/40 p-4 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={handleClose}
        >
          <div className="rounded-xl bg-primary/10 p-2">
            <Image src="/logo.png" alt="logo" width={42} height={28} />
          </div>
          <span className="text-lg font-bold text-foreground">Admin Panel</span>
        </Link>

        {/* Close button only makes sense on mobile — the sheet. */}
        {!isLargeScreen && (
          <button
            title="Close sidebar"
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation — scrolls when it overflows */}
      <nav className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {menuConfig.map((section) => {
          const isExpanded = expandedSections[section.title] ?? false;
          return (
            <div key={section.title} className="">
              <div className="flex items-center justify-between">
                <Link
                  href={`/${section.slug}`}
                  onClick={handleClose}
                  className="text-xs uppercase font-semibold text-muted-foreground hover:text-foreground transition-colors tracking-wide"
                >
                  {section.title}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
              </div>

              {isExpanded && (
                <ul className="space-y-1 mt-1">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={handleClose}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                          pathname === link.href ||
                          pathname?.startsWith(link.href)
                            ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                            : "border-transparent text-foreground hover:border-border hover:bg-muted/70"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {link.icon}
                          </span>
                          <span className="font-medium text-sm">
                            {link.name}
                          </span>
                        </div>

                        {link.showUnreadCount && unreadCount > 0 && (
                          <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-xs font-medium min-w-6 text-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}

                        {link.showContactCount && newContactCount > 0 && (
                          <span className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs font-medium min-w-5 text-center">
                            {newContactCount > 99 ? "99+" : newContactCount}
                          </span>
                        )}

                        {link.showOrderCount && unreadOrderCount > 0 && (
                          <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-xs font-medium min-w-6 text-center">
                            {unreadOrderCount > 99 ? "99+" : unreadOrderCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border shrink-0">
        <Link
          href={settingsLink.href}
          onClick={handleClose}
          className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all duration-200 ${
            pathname === settingsLink.href ||
            pathname?.startsWith(settingsLink.href)
              ? "border-primary/20 bg-primary/10 shadow-sm"
              : "border-transparent hover:border-border hover:bg-muted/70"
          }`}
        >
          <Settings className="text-primary" />
          <span className="font-medium text-sm text-foreground">
            {settingsLink.name}
          </span>
        </Link>
      </div>
    </>
  );

  // ── Desktop: static sidebar (flex child of AdminLayout) ──────────
  if (isLargeScreen) {
    return (
      <aside className="relative w-56 h-full flex flex-col overflow-hidden bg-background/95 text-foreground border-r border-border shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-md">
        {content}
      </aside>
    );
  }

  // ── Mobile: left sheet ──────────────────────────────────────────
  return (
    <LeftSheet
      open={sideBarToggle}
      onClose={() => setSideBarToggle(false)}
      width="w-3/4 max-w-xs"
    >
      {content}
    </LeftSheet>
  );
};

export default AdminSideBar;
