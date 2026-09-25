// components/admin/menu-config.tsx
// Single source of truth for admin navigation.
// Layouts no longer declare their own link lists — everything lives here.

import React from "react";
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
  ShoppingBag,
  Tag,
  Segment,
  Campaign,
  Assessment,
  Tune,
  Payment,
  AccountBalance,
  Public,
  Description,
  Article,
  Image as ImageIcon,
  Help,
  Widgets,
  GroupWork,
  Straighten,
  Menu as MenuIcon,
  MenuOpen,
  Search,
  Shield,
} from "@mui/icons-material";

export interface MenuLink {
  name: string;
  href: string;
  icon?: React.ReactNode;
  showUnreadCount?: boolean;
  showContactCount?: boolean;
  showOrderCount?: boolean;
  absolute?: boolean;
  /** Optional sub-tree — used for two-level drill-down (e.g. Store → Pages). */
  children?: MenuLink[];
}

export interface MenuSection {
  title: string;
  slug: string;
  links: MenuLink[];
}

// ─────────────────────────────────────────────────────────────────────
// Convention for drill-down sub-trees:
//
// Every parent link that has a `children` array repeats itself as the
// FIRST entry of that array, pointing at its own href with the same
// name and icon. The sidebar's row in the section list only opens the
// sub-tree — it does not navigate — so that first child is what makes
// the parent page reachable.
//
// Section-level roots (Analytics, Sales, Catalog, Customers, Marketing,
// Channels, Settings) are not part of this convention because they have
// no `children` of their own.
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// Content sub-tree — Marketing → Content.
// ─────────────────────────────────────────────────────────────────────
export const navigationLinks: MenuLink[] = [
  {
    name: "Navigation",
    href: "/marketing/content/navigation",
    icon: <MenuIcon />,
  },
  {
    name: "Menus",
    href: "/marketing/content/navigation/menus",
    icon: <MenuOpen />,
  },
  {
    name: "Collestions",
    href: "/marketing/content/navigation/collections",
    icon: <ImageIcon />,
  },
];

export const contentLinks: MenuLink[] = [
  {
    name: "Content",
    href: "/marketing/content",
    icon: <Code />,
  },
  {
    name: "Navigation",
    href: "/marketing/content/navigation",
    icon: <MenuIcon />,
    children: navigationLinks,
  },
  {
    name: "Hero Content",
    href: "/marketing/content/hero_content",
    icon: <ImageIcon />,
  },
  {
    name: "SEO Settings",
    href: "/marketing/content/seo",
    icon: <Search />,
  },
];

// ─────────────────────────────────────────────────────────────────────
// Marketing — merged.
// Renamed: "Email Marketing" → "Email Campaigns".
// Content and Promotions now expose nested sub-trees.
// ─────────────────────────────────────────────────────────────────────
export const marketingLinks: MenuLink[] = [
  {
    name: "Content",
    href: "/marketing/content",
    icon: <Code />,
    children: contentLinks,
  },
  { name: "Advertising", href: "/marketing/ads", icon: <Discount /> },
  {
    name: "Promotions",
    href: "/marketing/promotions",
    icon: <Discount />,
  },
  {
    name: "Email/SMS",
    href: "/marketing/email_sms",
    icon: <Email />,
  },
  {
    name: "Affiliate",
    href: "/marketing/affiliate",
    icon: <Code />,
  },
];

// ─────────────────────────────────────────────────────────────────────
// Store sub-tree — Channels → Store.
// ─────────────────────────────────────────────────────────────────────
export const storeLinks: MenuLink[] = [
  { name: "Store", href: "/channels/store", icon: <Campaign /> },
  { name: "Pages", href: "/channels/store/pges", icon: <Description /> },
  { name: "Posts", href: "/channels/store/posts", icon: <Article /> },
  { name: "Media", href: "/channels/store/media", icon: <ImageIcon /> },
  { name: "Blog", href: "/channels/store/blog", icon: <Article /> },
  { name: "Tags", href: "/channels/store/tags", icon: <Tag /> },
  { name: "FAQs", href: "/channels/store/faqs", icon: <Help /> },
];

// ─────────────────────────────────────────────────────────────────────
// Attributes sub-tree — Catalog → Attributes.
// ─────────────────────────────────────────────────────────────────────
export const attributeLinks: MenuLink[] = [
  { name: "Attributes", href: "/catalog/attributes", icon: <Assignment /> },
  { name: "Sets", href: "/catalog/attributes/sets", icon: <Widgets /> },
  { name: "Groups", href: "/catalog/attributes/groups", icon: <GroupWork /> },
  { name: "Units", href: "/catalog/attributes/units", icon: <Straighten /> },
];

// ─────────────────────────────────────────────────────────────────────
// POS sub-tree — Channels → POS.
//
// "POS" replaces the old "Dashboard" entry as the first row: it points
// at the same href (/channels/pos) and keeps the parent-as-first-child
// convention consistent across every drill-down.
// ─────────────────────────────────────────────────────────────────────
export const posLinks: MenuLink[] = [
  { name: "POS", href: "/channels/pos", icon: <Assessment /> },
  { name: "Reports", href: "/channels/pos/reports", icon: <Assessment /> },
];

// ─────────────────────────────────────────────────────────────────────
// Full menu.
// ─────────────────────────────────────────────────────────────────────
export const rawMenuConfig = [
  {
    title: "Analytics",
    links: [
      {
        name: "Sales Analytics",
        href: "/analytics/sales_reports",
        icon: <Assessment />,
      },
      {
        name: "Customer Analytics",
        href: "/analytics/customer_report",
        icon: <BarChart />,
      },
      {
        name: "Inventory Reports",
        href: "/analytics/inventory_reports",
        icon: <Inventory />,
      },
    ],
  },
  {
    title: "Sales",
    links: [
      {
        name: "Orders",
        href: "/sales/orders",
        icon: <ShoppingBag />,
        showOrderCount: true,
      },
      {
        name: "Fulfillment",
        href: "/sales/fulfillment",
        icon: <LocalShipping />,
      },
      { name: "Refunds", href: "/sales/refunds", icon: <Replay /> },
    ],
  },
  {
    title: "Catalog",
    links: [
      { name: "Products", href: "/catalog/products", icon: <Inventory2 /> },
      { name: "Category", href: "/catalog/categories", icon: <Category /> },
      { name: "Brands", href: "/catalog/brands", icon: <Tag /> },
      {
        name: "Attributes",
        href: "/catalog/attributes",
        icon: <Assignment />,
        children: attributeLinks,
      },
      { name: "Inventory", href: "/catalog/inventory", icon: <Inventory /> },
    ],
  },
  {
    title: "Customers",
    links: [
      { name: "Customers", href: "/customers/customers", icon: <Person2 /> },
      {
        name: "Segmentation",
        href: "/customers/segmentation",
        icon: <Segment />,
      },
      {
        name: "Messages",
        href: "/customers/messages",
        icon: <Assignment />,
      },
      {
        name: "Chat",
        href: "/customers/chat",
        icon: <Chat />,
        showUnreadCount: true,
      },
    ],
  },
  {
    title: "Marketing",
    links: marketingLinks,
  },
  {
    title: "Channels",
    links: [
      {
        name: "Store",
        href: "/channels/store",
        icon: <Campaign />,
        children: storeLinks,
      },
      {
        name: "POS",
        href: "/channels/pos",
        icon: <GetAppRounded />,
        children: posLinks,
      },
    ],
  },
  {
    title: "Settings",
    links: [
      {
        name: "General Settings",
        href: "/settings/general",
        icon: <Tune />,
      },
      { name: "Users", href: "/settings/users", icon: <Person2 /> },
      {
        name: "Roles & Permissions",
        href: "/settings/permissions_roles",
        icon: <Shield />,
      },
      { name: "Payments", href: "/settings/payment", icon: <Payment /> },
      {
        name: "Shipping",
        href: "/settings/shipping",
        icon: <LocalShipping />,
      },
      {
        name: "Tax Configuration",
        href: "/settings/tax",
        icon: <AccountBalance />,
      },
      { name: "Localization", href: "/settings/local", icon: <Public /> },
      { name: "Finances", href: "/settings/finances", icon: <Assessment /> },
      { name: "Returns", href: "/settings/returns", icon: <Replay /> },
    ],
  },
];

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const menuConfig: MenuSection[] = rawMenuConfig.map((section) => ({
  ...section,
  slug: slugify(section.title),
}));

export const SETTINGS_SLUG = "settings";
export const settingsSection =
  menuConfig.find((s) => s.slug === SETTINGS_SLUG) ?? null;
export const mainSections = menuConfig.filter((s) => s.slug !== SETTINGS_SLUG);

// Flat search index — parents + children, so typing "Pages" finds
// /channels/store/pages with "Channels › Store" as the context label.
//
// Parents repeat themselves as the first entry of their own `children`,
// so we filter that duplicate out of the child index — otherwise every
// parent would appear twice in search.
export const allLinks = menuConfig.flatMap((section) => {
  const parents = section.links.map((link) => ({
    name: link.name,
    href: link.href,
    icon: link.icon,
    sectionTitle: section.title,
  }));
  const children = section.links.flatMap((link) =>
    (link.children ?? [])
      .filter((child) => child.href !== link.href)
      .map((child) => ({
        name: child.name,
        href: child.href,
        icon: child.icon,
        sectionTitle: `${section.title} › ${link.name}`,
      })),
  );
  return [...parents, ...children];
});

// ─────────────────────────────────────────────────────────────────────
// Active-link lookup.
// Given a pathname, returns the deepest matching link entry — a child
// wins over its parent, and the most specific href wins over a shorter
// prefix. Used by the top bar to render the current page title.
// ─────────────────────────────────────────────────────────────────────
export interface ActiveLinkInfo {
  /** The link's own display name. */
  name: string;
  /** The section it belongs to (e.g. "Channels"). */
  sectionTitle: string;
  /** If this link is a child, the parent link's name (e.g. "Store"). */
  parentName?: string;
  /** The matched href. */
  href: string;
  /** The link's icon, when present. */
  icon?: React.ReactNode;
}

const matches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

// Flat index of every navigable link, deepest href first.
//
// Parents are pushed before children, and Array.find returns the first
// match, so an exact match on a parent's own href resolves to the
// parent entry (no parentName → section-level siblings). This is the
// correct behaviour when the user is on the parent's own page.
const flatIndex: ActiveLinkInfo[] = menuConfig
  .flatMap((section) => {
    const parents: ActiveLinkInfo[] = section.links.map((link) => ({
      name: link.name,
      sectionTitle: section.title,
      href: link.href,
      icon: link.icon,
    }));
    const children: ActiveLinkInfo[] = section.links.flatMap((link) =>
      (link.children ?? []).map((child) => ({
        name: child.name,
        sectionTitle: section.title,
        parentName: link.name,
        href: child.href,
        icon: child.icon,
      })),
    );
    return [...parents, ...children];
  })
  .sort((a, b) => b.href.length - a.href.length);

function matchLink(pathname: string): ActiveLinkInfo | null {
  // Exact match wins outright.
  const exact = flatIndex.find((l) => l.href === pathname);
  if (exact) return exact;
  // Otherwise the longest href the pathname descends from.
  return flatIndex.find((l) => matches(pathname, l.href)) ?? null;
}

export function findActiveLink(pathname: string | null): ActiveLinkInfo | null {
  if (!pathname) return null;
  return matchLink(pathname);
}

// ─────────────────────────────────────────────────────────────────────
// Active navigation context.
// Returns the current link + its siblings (same section for a parent, or
// same parent's children for a child) so the top bar can render a
// "switch page" dropdown.
// ─────────────────────────────────────────────────────────────────────
export interface NavContext {
  /** The currently active link. */
  current: ActiveLinkInfo;
  /** The active link's siblings — same level, same parent. */
  siblings: ActiveLinkInfo[];
}

export function findNavContext(pathname: string | null): NavContext | null {
  if (!pathname) return null;
  const current = matchLink(pathname);
  if (!current) return null;

  let siblings: ActiveLinkInfo[] = [];

  if (current.parentName) {
    // Child link → siblings are the other children of the same parent.
    // Filter out the parent's own mirror entry so the dropdown doesn't
    // offer the current page as one of its own siblings.
    const section = menuConfig.find((s) => s.title === current.sectionTitle);
    const parent = section?.links.find((l) => l.name === current.parentName);
    siblings = (parent?.children ?? [])
      .filter((c) => c.href !== parent?.href)
      .map((c) => ({
        name: c.name,
        href: c.href,
        sectionTitle: current.sectionTitle,
        parentName: current.parentName,
        icon: c.icon,
      }));
  } else {
    // Parent link → siblings are the other top-level links in the section.
    const section = menuConfig.find((s) => s.title === current.sectionTitle);
    siblings = (section?.links ?? []).map((l) => ({
      name: l.name,
      href: l.href,
      sectionTitle: current.sectionTitle,
      icon: l.icon,
    }));
  }

  return { current, siblings };
}
