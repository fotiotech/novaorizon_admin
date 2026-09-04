// components/AdminSideBar.tsx
import React, { LegacyRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Assignment,
  BarChart,
  Category,
  Chat,
  CheckCircle,
  CollectionsBookmark,
  Dashboard,
  Discount,
  Email,
  GetAppRounded,
  Group,
  Inventory,
  LocalShipping,
  Person2,
  Replay,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Notifications,
  Receipt,
  AttachMoney,
  Segment,
  History,
  ReceiptLong,
  Campaign,
  Public,
  Code,
  Assessment,
  Inventory2,
  ManageAccounts,
  Payment,
  Language,
  Room,
} from "@mui/icons-material";
import { useUnreadMessages } from "@/app/(customers)/customers/chat/_component/useUnreadMessages";

export interface MenuLink {
  name: string;
  href: string;
  icon?: React.ReactNode;
  showUnreadCount?: boolean;
}

export interface MenuSection {
  title: string;
  slug: string;
  links: MenuLink[];
}

interface AdminSideBarProps {
  domNode?: LegacyRef<HTMLDivElement>;
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (open: boolean) => void;
}

// Helper to slugify a section title
const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Original menu configuration (without href prefixes)
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
      { name: "Orders", href: "/orders", icon: <ShoppingBag /> },
      { name: "Carriers", href: "/carriers", icon: <LocalShipping /> },
      { name: "Refunds", href: "/refunds", icon: <Replay /> },
    ],
  },
  {
    title: "Catalog",
    links: [
      { name: "Products", href: "/products", icon: <Inventory2 /> },
      { name: "Categories", href: "/categories", icon: <Category /> },
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
      { name: "Feedbacks", href: "/feedbacks", icon: <Assignment /> },
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
    title: "POS",
    links: [{ name: "Point of sales", href: "/pos", icon: <GetAppRounded /> }],
  },
  {
    title: "Store",
    links: [
      { name: "Pages", href: "/pages", icon: <Campaign /> },
      { name: "Posts", href: "/posts", icon: <Language /> },
      { name: "Media", href: "/media", icon: <Language /> },
      { name: "Blog", href: "/blog", icon: <Campaign /> },
      { name: "FAQs", href: "/faqs", icon: <Assignment /> },
    ],
  },
];

// Build the final menu with section‑prefixed hrefs and slugs
const menuConfig: MenuSection[] = rawMenuConfig.map((section) => {
  const slug = slugify(section.title);
  const links = section.links.map((link) => {
    let newHref = link.href;
    const prefix = `/${slug}`;
    if (!newHref.startsWith(prefix)) {
      newHref = `${prefix}${newHref}`;
    }
    return { ...link, href: newHref };
  });
  return { ...section, slug, links };
});

const settingsLink: MenuLink = { name: "Settings", href: "/settings" };

const AdminSideBar: React.FC<AdminSideBarProps> = ({
  domNode,
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}) => {
  const pathname = usePathname();
  const unreadCount = useUnreadMessages();

  // All sections expanded by default
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
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleClose = () => {
    if (screenSize <= 1024) setSideBarToggle(false);
  };

  const isLargeScreen = screenSize > 1024;
  const shouldShow = sideBarToggle || isLargeScreen;

  return (
    <>
      {/* Backdrop for mobile only */}
      {sideBarToggle && !isLargeScreen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleClose}
        />
      )}

      <aside
        ref={domNode}
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${shouldShow ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          w-3/5
           lg:w-52 h-full overflow-y-auto
          bg-background/95 text-foreground border-r border-border shadow-[0_18px_45px_rgba(15,23,42,0.12)]
          flex flex-col justify-between backdrop-blur-md
        `}
      >
        <div>
          <div className="flex items-center justify-between border-b border-border bg-card/40 p-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <Image src="/logo.png" alt="logo" width={42} height={28} />
              </div>
              <span className="text-lg font-bold text-foreground">
                Admin Panel
              </span>
            </Link>
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
          <nav className="p-4 space-y-6 overflow-y-auto">
            {menuConfig.map((section) => {
              const isExpanded = expandedSections[section.title] ?? true;
              return (
                <div key={section.title} className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      href={`/${section.slug}`}
                      onClick={handleClose}
                      className="text-xs uppercase font-semibold text-muted-foreground hover:text-foreground transition-colors tracking-wide"
                    >
                      {section.title}
                    </Link>
                    <button
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
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${
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
                              <span className="font-medium">{link.name}</span>
                            </div>
                            {link.showUnreadCount && unreadCount > 0 && (
                              <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-xs font-medium min-w-6 text-center">
                                {unreadCount > 99 ? "99+" : unreadCount}
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
        </div>
        <div className="p-4 border-t border-border">
          <Link
            href={settingsLink.href}
            onClick={handleClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors duration-200 font-medium"
          >
            <Settings />
            <span>{settingsLink.name}</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default AdminSideBar;
