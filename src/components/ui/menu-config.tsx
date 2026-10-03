// components/admin/menu-config.tsx
// Single source of truth for admin navigation.
// Layouts no longer declare their own link lists — everything lives here.
//
// Sections map 1:1 to the 15 core admin-panel modules:
//
//   1. Dashboard      — KPIs, live view, analytics overview
//   2. Users & Access — admin users, roles, permissions, security
//   3. Customers      — customer profiles, segments, CRM, chat
//   4. Catalog        — products, categories, brands, attributes
//   5. Inventory      — stock, warehouses, suppliers, POs
//   6. Orders         — orders, drafts, fulfillment, invoices
//   7. Payments       — transactions, gateways, refunds, payouts
//   8. Shipping       — carriers, zones, labels, tracking
//   9. Marketing      — ads, promotions, coupons, email/SMS, affiliates
//  10. Channels       — storefront CMS + POS
//  11. Support        — returns/RMA, tickets, chat, help center
//  12. Localization   — taxes, currencies, languages, regions
//  13. Integrations   — API, webhooks, apps, automation, import/export
//  14. Reports        — reports, audit logs, compliance, backups
//  15. Settings       — global config, feature flags

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
  Dashboard as DashboardIcon,
  People,
  VpnKey,
  Receipt,
  CreditCard,
  Language,
  Extension,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Api,
  FactCheck,
  PointOfSale,
} from "@mui/icons-material";

export interface MenuLink {
  name: string;
  href: string;
  icon?: React.ReactNode;
  showUnreadCount?: boolean;
  showContactCount?: boolean;
  showOrderCount?: boolean;
  absolute?: boolean;
  /** Optional sub-tree — links may nest arbitrarily deep. */
  children?: MenuLink[];
}

export interface MenuSection {
  title: string;
  slug: string;
  links: MenuLink[];
}

// ─────────────────────────────────────────────────────────────────────
// Drill-down convention:
//
// Links may nest arbitrarily deep via `children`. The sidebar row for
// a parent opens its sub-tree (it does not navigate), so any parent
// whose own landing page must remain reachable repeats itself as the
// FIRST entry of its own `children` (same name + href). Navigation and
// Attributes do this; Store / Content don't need to because their
// landing pages are only opened from their parents.
//
// Every helper below recurses the full tree:
//   • allLinks       → flat search index, breadcrumb-labelled
//   • flatIndex      → deepest-href-first lookup for the top bar
//   • findNavContext → siblings at the same level, any depth
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// Navigation sub-tree — Channels → Store → Content → Navigation.
// ─────────────────────────────────────────────────────────────────────
export const navigationLinks: MenuLink[] = [
  {
    name: "Navigation",
    href: "/channels/store/content/navigation",
    icon: <MenuIcon />,
  },
  {
    name: "Menus",
    href: "/channels/store/content/navigation/menus",
    icon: <MenuOpen />,
  },
];

export const contentBlockLinks: MenuLink[] = [
  {
    name: "Blocks",
    href: "/channels/store/content/blocks",
    icon: <MenuIcon />,
  },
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
// Full menu — one section per module.
// ─────────────────────────────────────────────────────────────────────
export const rawMenuConfig = [
  // ── 1. Dashboard & Analytics ──────────────────────────────────────
  {
    title: "Dashboard",
    links: [
      {
        name: "Overview",
        href: "/dashboard/overview",
        icon: <DashboardIcon />,
      },
      { name: "Live", href: "/dashboard/live", icon: <AnalyticsIcon /> },
      {
        name: "Sales Analytics",
        href: "/dashboard/sales",
        icon: <Assessment />,
      },
      {
        name: "Customer Analytics",
        href: "/dashboard/customers",
        icon: <BarChart />,
      },
      {
        name: "Inventory Analytics",
        href: "/dashboard/inventory",
        icon: <Inventory />,
      },
    ],
  },

  // ── 2. User, Role & Access Management ─────────────────────────────
  {
    title: "Users & Access",
    links: [
      { name: "Users", href: "/users/users", icon: <People /> },
      { name: "Roles", href: "/users/roles", icon: <Shield /> },
      { name: "Permissions", href: "/users/permissions", icon: <VpnKey /> },
      { name: "Teams", href: "/users/teams", icon: <GroupWork /> },
      { name: "Security", href: "/users/security", icon: <Shield /> },
    ],
  },

  // ── 3. Customer & CRM ─────────────────────────────────────────────
  {
    title: "Customers",
    links: [
      { name: "Customers", href: "/customers/customers", icon: <Person2 /> },
      { name: "Segments", href: "/customers/segments", icon: <Segment /> },
      {
        name: "Messages",
        href: "/customers/messages",
        icon: <Email />,
        showContactCount: true,
      },
      {
        name: "Chat",
        href: "/customers/chat",
        icon: <Chat />,
        showUnreadCount: true,
      },
      { name: "Reviews", href: "/customers/reviews", icon: <Assignment /> },
    ],
  },

  // ── 4. Catalog & Product Management ───────────────────────────────
  {
    title: "Catalog",
    links: [
      { name: "Products", href: "/catalog/products", icon: <Inventory2 /> },
      { name: "Categories", href: "/catalog/categories", icon: <Category /> },
      { name: "Brands", href: "/catalog/brands", icon: <Tag /> },
      {
        name: "Attributes",
        href: "/catalog/attributes",
        icon: <Assignment />,
        children: attributeLinks,
      },
      {
        name: "Collections",
        href: "/catalog/collections",
        icon: <ImageIcon />,
      },
    ],
  },

  // ── 5. Inventory & Warehouse ──────────────────────────────────────
  {
    title: "Inventory",
    links: [
      { name: "Stock", href: "/inventory/stock", icon: <Inventory /> },
      { name: "Locations", href: "/inventory/locations", icon: <Inventory2 /> },
      {
        name: "Purchase Orders",
        href: "/inventory/purchase-orders",
        icon: <Receipt />,
      },
      {
        name: "Suppliers",
        href: "/inventory/suppliers",
        icon: <LocalShipping />,
      },
      { name: "Adjustments", href: "/inventory/adjustments", icon: <Tune /> },
      { name: "Transfers", href: "/inventory/transfers", icon: <Replay /> },
    ],
  },

  // ── 6. Orders & Fulfillment ───────────────────────────────────────
  {
    title: "Orders",
    links: [
      {
        name: "Orders",
        href: "/orders/orders",
        icon: <ShoppingBag />,
        showOrderCount: true,
      },
      { name: "Drafts", href: "/orders/drafts", icon: <Description /> },
      {
        name: "Fulfillment",
        href: "/orders/fulfillment",
        icon: <LocalShipping />,
      },
      { name: "Invoices", href: "/orders/invoices", icon: <Receipt /> },
    ],
  },

  // ── 7. Payments & Transactions ────────────────────────────────────
  {
    title: "Payments",
    links: [
      {
        name: "Transactions",
        href: "/payments/transactions",
        icon: <Payment />,
      },
      { name: "Gateways", href: "/payments/gateways", icon: <CreditCard /> },
      { name: "Refunds", href: "/payments/refunds", icon: <Replay /> },
      { name: "Disputes", href: "/payments/disputes", icon: <Assignment /> },
      { name: "Payouts", href: "/payments/payouts", icon: <AccountBalance /> },
    ],
  },

  // ── 8. Shipping & Logistics ───────────────────────────────────────
  {
    title: "Shipping",
    links: [
      {
        name: "Shipments",
        href: "/shipping/shipments",
        icon: <LocalShipping />,
      },
      { name: "Carriers", href: "/shipping/carriers", icon: <LocalShipping /> },
      { name: "Zones & Rates", href: "/shipping/zones", icon: <Public /> },
      { name: "Labels", href: "/shipping/labels", icon: <Description /> },
      { name: "Tracking", href: "/shipping/tracking", icon: <Search /> },
    ],
  },

  // ── 9. Promotions & Marketing ─────────────────────────────────────
  {
    title: "Marketing",
    links: [
      { name: "Advertising", href: "/marketing/ads", icon: <Discount /> },
      {
        name: "Promotions",
        href: "/marketing/promotions",
        icon: <Discount />,
      },
      { name: "Coupons", href: "/marketing/coupons", icon: <Discount /> },
      {
        name: "Email/SMS/Push",
        href: "/marketing/email_sms",
        icon: <Email />,
      },
      { name: "Affiliates", href: "/marketing/affiliate", icon: <Code /> },
      { name: "Campaigns", href: "/marketing/campaigns", icon: <Campaign /> },
    ],
  },

  // ── 10. Channels & Storefront CMS ─────────────────────────────────
  {
    title: "Channels",
    links: [
      {
        name: "Store",
        href: "/channels/store",
        icon: <ImageIcon />,
        children: [
          {
            name: "Content",
            href: "/channels/store/content",
            icon: <Code />,
            children: [
              {
                name: "Navigation",
                href: "/channels/store/content/navigation",
                icon: <MenuIcon />,
                children: navigationLinks,
              },
              {
                name: "Blocks",
                href: "/channels/store/content/blocks",
                icon: <Code />,
                children: contentBlockLinks,
              },
              {
                name: "Hero Content",
                href: "/channels/store/content/hero",
                icon: <ImageIcon />,
              },
              {
                name: "SEO Settings",
                href: "/channels/store/content/seo",
                icon: <Search />,
              },
            ],
          },
          {
            name: "Pages",
            href: "/channels/store/pages",
            icon: <Description />,
          },
          { name: "Posts", href: "/channels/store/posts", icon: <Article /> },
          { name: "Blog", href: "/channels/store/blog", icon: <Article /> },
          { name: "Media", href: "/channels/store/media", icon: <ImageIcon /> },
          { name: "Tags", href: "/channels/store/tags", icon: <Tag /> },
          { name: "FAQs", href: "/channels/store/faqs", icon: <Help /> },
        ],
      },
      { name: "POS", href: "/channels/pos", icon: <PointOfSale /> },
    ],
  },

  // ── 11. Returns, Refunds & Customer Service ───────────────────────
  {
    title: "Support",
    links: [
      { name: "Returns", href: "/support/returns", icon: <Replay /> },
      { name: "Tickets", href: "/support/tickets", icon: <Assignment /> },
      { name: "Chat", href: "/support/chat", icon: <Chat /> },
      { name: "Help Center", href: "/support/help", icon: <Help /> },
      { name: "Disputes", href: "/support/disputes", icon: <Shield /> },
    ],
  },

  // ── 12. Taxes, Currencies & Localization ──────────────────────────
  {
    title: "Localization",
    links: [
      { name: "Taxes", href: "/localization/taxes", icon: <AccountBalance /> },
      {
        name: "Currencies",
        href: "/localization/currencies",
        icon: <Payment />,
      },
      {
        name: "Languages",
        href: "/localization/languages",
        icon: <Language />,
      },
      { name: "Regions", href: "/localization/regions", icon: <Public /> },
    ],
  },

  // ── 13. Integrations, API & Automation ────────────────────────────
  {
    title: "Integrations",
    links: [
      { name: "API Keys", href: "/integrations/api", icon: <Api /> },
      { name: "Webhooks", href: "/integrations/webhooks", icon: <Extension /> },
      { name: "Apps", href: "/integrations/apps", icon: <Extension /> },
      { name: "Automation", href: "/integrations/automation", icon: <Tune /> },
      {
        name: "Import / Export",
        href: "/integrations/import-export",
        icon: <GetAppRounded />,
      },
    ],
  },

  // ── 14. Reports, Compliance & Security ────────────────────────────
  {
    title: "Reports",
    links: [
      { name: "Reports", href: "/reports", icon: <Assessment /> },
      {
        name: "Audit Logs",
        href: "/reports/audit-logs",
        icon: <FactCheck />,
      },
      { name: "Compliance", href: "/reports/compliance", icon: <Shield /> },
      { name: "Backups", href: "/reports/backups", icon: <Inventory2 /> },
    ],
  },

  // ── 15. Settings & Configuration ──────────────────────────────────
  {
    title: "Settings",
    links: [
      { name: "General", href: "/settings/general", icon: <SettingsIcon /> },
      { name: "Store", href: "/settings/store", icon: <Campaign /> },
      { name: "Checkout", href: "/settings/checkout", icon: <Payment /> },
      {
        name: "Notifications",
        href: "/settings/notifications",
        icon: <Email />,
      },
      {
        name: "Feature Flags",
        href: "/settings/feature-flags",
        icon: <Tune />,
      },
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

// ─────────────────────────────────────────────────────────────────────
// Recursive walker — flattens any tree depth into a list of entries,
// each carrying its ancestor chain (root → immediate parent).
// ─────────────────────────────────────────────────────────────────────
export interface LinkRef {
  name: string;
  href: string;
}

export interface ActiveLinkInfo {
  /** The link's own display name. */
  name: string;
  /** The section it belongs to (e.g. "Channels"). */
  sectionTitle: string;
  /** The matched href. */
  href: string;
  /** The link's icon, when present. */
  icon?: React.ReactNode;
  /** Immediate parent name, when this link is nested. */
  parentName?: string;
  /** Immediate parent href — used to locate the sibling set. */
  parentHref?: string;
  /** Full ancestor chain (root → immediate parent). Empty for top-level links. */
  ancestors: LinkRef[];
}

function walkLinks(
  links: MenuLink[],
  sectionTitle: string,
  ancestors: LinkRef[],
): ActiveLinkInfo[] {
  const out: ActiveLinkInfo[] = [];
  for (const link of links) {
    const parent = ancestors[ancestors.length - 1];
    out.push({
      name: link.name,
      href: link.href,
      icon: link.icon,
      sectionTitle,
      parentName: parent?.name,
      parentHref: parent?.href,
      ancestors,
    });
    if (link.children?.length) {
      out.push(
        ...walkLinks(link.children, sectionTitle, [
          ...ancestors,
          { name: link.name, href: link.href },
        ]),
      );
    }
  }
  return out;
}

// Breadcrumb label used by search results, e.g.
// "Channels › Store › Content › Navigation".
const breadcrumb = (sectionTitle: string, ancestors: LinkRef[]) =>
  [sectionTitle, ...ancestors.map((a) => a.name)].join(" › ");

// ─────────────────────────────────────────────────────────────────────
// Flat search index — every navigable link at any depth.
// Deduped by href, so a parent that repeats itself as the first child
// of its own sub-tree only appears once (the shallower entry wins).
// ─────────────────────────────────────────────────────────────────────
export const allLinks = (() => {
  const seen = new Set<string>();
  return menuConfig.flatMap((section) =>
    walkLinks(section.links, section.title, [])
      .filter((entry) => {
        if (seen.has(entry.href)) return false;
        seen.add(entry.href);
        return true;
      })
      .map((entry) => ({
        name: entry.name,
        href: entry.href,
        icon: entry.icon,
        sectionTitle: breadcrumb(entry.sectionTitle, entry.ancestors),
      })),
  );
})();

// ─────────────────────────────────────────────────────────────────────
// Active-link lookup.
// Deepest-href-first index, so the most specific page wins over a
// shorter prefix. Same-length ties break in insertion order, which is
// parent-before-mirror — so a shallow parent beats its own mirror entry
// when both share an href (matches the previous single-level behaviour).
// ─────────────────────────────────────────────────────────────────────
const matches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

const flatIndex: ActiveLinkInfo[] = menuConfig
  .flatMap((section) => walkLinks(section.links, section.title, []))
  .sort((a, b) => b.href.length - a.href.length);

function matchLink(pathname: string): ActiveLinkInfo | null {
  const exact = flatIndex.find((l) => l.href === pathname);
  if (exact) return exact;
  return flatIndex.find((l) => matches(pathname, l.href)) ?? null;
}

export function findActiveLink(pathname: string | null): ActiveLinkInfo | null {
  if (!pathname) return null;
  return matchLink(pathname);
}

// BFS lookup of a link object by href — returns the shallowest match,
// which is what we want when a mirror entry shares its parent's href.
function findLinkByHref(href: string): MenuLink | null {
  const queue: MenuLink[] = menuConfig.flatMap((s) => s.links);
  while (queue.length) {
    const link = queue.shift()!;
    if (link.href === href) return link;
    if (link.children?.length) queue.push(...link.children);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Active navigation context.
// Returns the current link + its siblings at the same level (any depth)
// so the top bar can render a "switch page" dropdown.
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

  // Nested link → siblings are the other children of the immediate parent.
  // The current entry is excluded so the dropdown doesn't offer the page
  // you're already on; any parent mirror entry with a different href stays.
  if (current.parentHref) {
    const parent = findLinkByHref(current.parentHref);
    const siblings: ActiveLinkInfo[] = (parent?.children ?? [])
      .filter((c) => c.href !== current.href)
      .map((c) => ({
        name: c.name,
        href: c.href,
        icon: c.icon,
        sectionTitle: current.sectionTitle,
        parentName: parent?.name,
        parentHref: parent?.href,
        ancestors: current.ancestors,
      }));
    return { current, siblings };
  }

  // Top-level link → siblings are the other top-level links in the section.
  const section = menuConfig.find((s) => s.title === current.sectionTitle);
  const siblings: ActiveLinkInfo[] = (section?.links ?? []).map((l) => ({
    name: l.name,
    href: l.href,
    icon: l.icon,
    sectionTitle: current.sectionTitle,
    ancestors: [],
  }));
  return { current, siblings };
}
