// components/AdminSideBar.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  ArrowBack,
  Home,
  Search,
  Close,
  Settings,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { SignIn } from "../app/(auth)/components/SignInButton";
import { useUnreadMessages } from "@/app/(customers)/customers/chat/_component/useUnreadMessages";
import { useNewContactCount } from "@/hooks/useNewContactCount";
import LeftSheet from "@/components/ux/LeftSheet";
import { useUnreadOrderNotifications } from "@/app/(dashboard)/dashboard/notifications/_component/hooks/useUnreadOrderNotifications";
import {
  menuConfig,
  allLinks,
  settingsSection,
  mainSections,
  SETTINGS_SLUG,
  type MenuLink,
  type MenuSection,
} from "@/components/ui/menu-config";

interface AdminSideBarProps {
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (open: boolean) => void;
}

const MAX_RESULTS = 20;

type Direction = "forward" | "back" | "same";

const itemBase =
  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out";
const itemIdle = "text-foreground/80 hover:bg-muted/60 hover:text-foreground";
const itemActive = "bg-primary/10 text-primary";

const AdminSideBar: React.FC<AdminSideBarProps> = ({
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const user = session?.data?.user as any;
  const unreadCount = useUnreadMessages();
  const newContactCount = useNewContactCount();
  const { count: unreadOrderCount } = useUnreadOrderNotifications();

  // path[0] = section slug. path[1] = link href we drilled into to show children.
  const [path, setPath] = useState<string[]>([]);
  const [direction, setDirection] = useState<Direction>("same");
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allLinks
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.sectionTitle.toLowerCase().includes(q) ||
          l.href.toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);
  }, [query]);

  const searching = query.trim().length > 0;

  const currentSection = useMemo(
    () =>
      path.length === 0
        ? null
        : (menuConfig.find((s) => s.slug === path[0]) ?? null),
    [path],
  );

  const currentParentLink: MenuLink | null = useMemo(() => {
    if (!currentSection || path.length < 2) return null;
    return currentSection.links.find((l) => l.href === path[1]) ?? null;
  }, [currentSection, path]);

  const linkHasActiveRoute = (link: MenuLink) =>
    pathname === link.href ||
    pathname?.startsWith(link.href) ||
    (link.children ?? []).some(
      (c) => pathname === c.href || pathname?.startsWith(c.href),
    );

  const sectionHasActiveRoute = (section: MenuSection) =>
    section.links.some(linkHasActiveRoute);

  // Keep displayed path in sync with the URL: if the current route belongs
  // to a section (or to a child under a section), reflect that.
  useEffect(() => {
    if (!pathname) return;

    const owner = menuConfig.find(sectionHasActiveRoute);
    if (!owner) return;

    // Did we land on a child of one of the section's links?
    const owningParent = owner.links.find((link) =>
      (link.children ?? []).some(
        (c) => pathname === c.href || pathname?.startsWith(c.href),
      ),
    );

    setPath((prev) => {
      const next = owningParent
        ? [owner.slug, owningParent.href]
        : [owner.slug];
      const sameLength = prev.length === next.length;
      const sameValues = sameLength && prev.every((v, i) => v === next[i]);
      if (sameValues) return prev;
      setDirection(prev.length === 0 ? "forward" : "same");
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openSection = (slug: string) => {
    setDirection("forward");
    setPath([slug]);
  };
  const openChildren = (sectionSlug: string, href: string) => {
    setDirection("forward");
    setPath([sectionSlug, href]);
  };
  const goBack = () => {
    setDirection("back");
    setPath((prev) => (prev.length > 1 ? [prev[0]] : []));
  };
  const goToRoot = () => {
    setDirection("back");
    setPath([]);
  };

  const handleClose = () => {
    if (screenSize <= 1024) setSideBarToggle(false);
  };

  const isLargeScreen = screenSize > 1024;

  const renderBadges = (link: MenuLink) => (
    <>
      {link.showUnreadCount && unreadCount > 0 && (
        <span className="badge-pop ml-auto rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      {link.showContactCount && newContactCount > 0 && (
        <span className="badge-pop ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
          {newContactCount > 99 ? "99+" : newContactCount}
        </span>
      )}
      {link.showOrderCount && unreadOrderCount > 0 && (
        <span className="badge-pop ml-auto rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground">
          {unreadOrderCount > 99 ? "99+" : unreadOrderCount}
        </span>
      )}
    </>
  );

  const viewAnimClass =
    direction === "forward"
      ? "view-enter-forward"
      : direction === "back"
        ? "view-enter-back"
        : "view-enter-fade";

  const highlight = (text: string, q: string) => {
    const needle = q.trim();
    if (!needle) return text;
    const idx = text.toLowerCase().indexOf(needle.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-primary/20 px-0.5 text-primary">
          {text.slice(idx, idx + needle.length)}
        </mark>
        {text.slice(idx + needle.length)}
      </>
    );
  };

  const ActiveBar = () => (
    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
  );

  // ── Search view ───────────────────────────────────────────────────
  const renderSearch = () => (
    <>
      <div className="mb-2 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        <span>Results</span>
        <span className="ml-auto tabular-nums">{results.length}</span>
      </div>

      {results.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          No matches for{" "}
          <span className="font-medium text-foreground">“{query}”</span>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {results.map((r, i) => {
            const isActive =
              pathname === r.href || pathname?.startsWith(r.href);
            return (
              <li
                key={r.href}
                className="stagger-item"
                style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}
              >
                <button
                  type="button"
                  onClick={() => {
                    router.push(r.href);
                    setQuery("");
                    handleClose();
                  }}
                  className={`${itemBase} ${
                    isActive ? itemActive : itemIdle
                  } justify-start`}
                >
                  {isActive && <ActiveBar />}
                  <span className="shrink-0 text-muted-foreground [&>svg]:text-lg group-hover:text-foreground">
                    {r.icon}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm leading-tight">
                      {highlight(r.name, query)}
                    </p>
                    <p className="truncate text-[11px] font-normal text-muted-foreground">
                      {r.sectionTitle}
                    </p>
                  </div>
                  <ChevronRight
                    sx={{ fontSize: 16 }}
                    className="shrink-0 text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  // ── Root view ─────────────────────────────────────────────────────
  const renderRoot = () => (
    <ul className="space-y-0.5">
      {mainSections.map((section, i) => {
        const hasActive = sectionHasActiveRoute(section);
        return (
          <li
            key={section.slug}
            className="stagger-item"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <button
              type="button"
              onClick={() => openSection(section.slug)}
              className={`${itemBase} ${
                hasActive ? itemActive : itemIdle
              } justify-between`}
            >
              {hasActive && <ActiveBar />}
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground [&>svg]:text-lg group-hover:text-foreground">
                  {section.links[0]?.icon}
                </span>
                <span>{section.title}</span>
              </span>
              <ChevronRight
                sx={{ fontSize: 16 }}
                className="text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );

  // ── Section view ──────────────────────────────────────────────────
  const renderSection = (section: MenuSection) => (
    <>
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back to menu"
          className="-ml-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-90"
        >
          <ArrowBack sx={{ fontSize: 16 }} />
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"
        >
          <button
            type="button"
            onClick={goToRoot}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home sx={{ fontSize: 13 }} />
            <span>Menu</span>
          </button>
          <ChevronRight sx={{ fontSize: 13 }} className="opacity-50" />
          <span className="truncate text-foreground/80">{section.title}</span>
        </nav>
      </div>

      <ul className="space-y-0.5">
        {section.links.map((link, i) => {
          const isActive = linkHasActiveRoute(link);
          const hasChildren = (link.children?.length ?? 0) > 0;

          // A link with children becomes a drill-in button instead of a
          // navigable link — tapping the row reveals its sub-tree.
          if (hasChildren) {
            return (
              <li
                key={link.href}
                className="stagger-item"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <button
                  type="button"
                  onClick={() => openChildren(section.slug, link.href)}
                  className={`${itemBase} ${
                    isActive ? itemActive : itemIdle
                  } justify-between`}
                >
                  {isActive && <ActiveBar />}
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground [&>svg]:text-lg group-hover:text-foreground">
                      {link.icon}
                    </span>
                    <span>{link.name}</span>
                  </span>
                  <ChevronRight
                    sx={{ fontSize: 16 }}
                    className="text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                  />
                </button>
              </li>
            );
          }

          return (
            <li
              key={link.href}
              className="stagger-item"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <Link
                href={link.href}
                onClick={handleClose}
                className={`${itemBase} ${
                  isActive ? itemActive : itemIdle
                } justify-between`}
              >
                {isActive && <ActiveBar />}
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground [&>svg]:text-lg group-hover:text-foreground">
                    {link.icon}
                  </span>
                  <span>{link.name}</span>
                </span>
                {renderBadges(link)}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );

  // ── Children view (level 2) ───────────────────────────────────────
  const renderChildren = (section: MenuSection, parent: MenuLink) => (
    <>
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="-ml-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-90"
        >
          <ArrowBack sx={{ fontSize: 16 }} />
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"
        >
          <button
            type="button"
            onClick={goToRoot}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home sx={{ fontSize: 13 }} />
            <span>Menu</span>
          </button>
          <ChevronRight sx={{ fontSize: 13 }} className="opacity-50" />
          <button
            type="button"
            onClick={() => {
              setDirection("back");
              setPath([section.slug]);
            }}
            className="truncate transition-colors hover:text-foreground"
          >
            {section.title}
          </button>
          <ChevronRight sx={{ fontSize: 13 }} className="opacity-50" />
          <span className="truncate text-foreground/80">{parent.name}</span>
        </nav>
      </div>

      <ul className="space-y-0.5">
        {(parent.children ?? []).map((link, i) => {
          const isActive =
            pathname === link.href || pathname?.startsWith(link.href);
          return (
            <li
              key={link.href}
              className="stagger-item"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <Link
                href={link.href}
                onClick={handleClose}
                className={`${itemBase} ${
                  isActive ? itemActive : itemIdle
                } justify-between`}
              >
                {isActive && <ActiveBar />}
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground [&>svg]:text-lg group-hover:text-foreground">
                    {link.icon}
                  </span>
                  <span>{link.name}</span>
                </span>
                {renderBadges(link)}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );

  // ── Header: [logo · close] / [pill search] ────────────────────────
  const renderHeader = () => (
    <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-4">
      {/* Line 1: logo + close */}
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={handleClose}
        >
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Image src="/logo.png" alt="logo" width={28} height={19} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Novaorizon
          </span>
        </Link>

        {!isLargeScreen && (
          <button
            title="Close sidebar"
            type="button"
            onClick={handleClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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

      {/* Line 2: full-width search */}
      <div
        className={`flex w-full items-center gap-2 rounded-full border border-border bg-transparent px-3 py-1.5 transition-colors duration-150 ${
          searching ? "border-primary/50" : "focus-within:border-primary/50"
        }`}
      >
        <Search
          sx={{ fontSize: 15 }}
          className="shrink-0 text-muted-foreground/70"
        />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              e.currentTarget.blur();
            }
          }}
          placeholder="Search…"
          aria-label="Search menu links"
          className="
            m-0 h-auto w-auto min-w-0 flex-1
            rounded-none border-0 bg-transparent p-0
            text-sm leading-none text-foreground
            placeholder:text-muted-foreground/60
            outline-none ring-0 shadow-none appearance-none
            focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none
            [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_transparent]
            [&:-webkit-autofill]:[-webkit-text-fill-color:inherit]
            [&:-webkit-autofill]:transition-[background-color_9999s]
          "
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              searchInputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="shrink-0 text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            <Close sx={{ fontSize: 15 }} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 items-center rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium leading-none text-muted-foreground/70 md:inline-flex">
            ⌘K
          </kbd>
        )}
      </div>
    </div>
  );

  // ── Footer: profile + settings icon ───────────────────────────────
  const settingsInView = currentSection?.slug === SETTINGS_SLUG;
  const settingsHasActiveRoute =
    settingsSection && sectionHasActiveRoute(settingsSection);

  const renderFooter = () => (
    <div className="flex shrink-0 items-center gap-2 border-t border-border/60 px-3 py-3">
      {user ? (
        <Link
          href="/profile"
          onClick={handleClose}
          className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
        >
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-semibold leading-none text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">
            {user?.name ?? user?.email ?? "Account"}
          </p>
        </Link>
      ) : (
        <div className="min-w-0 flex-1">
          <SignIn />
        </div>
      )}

      {settingsSection && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            openSection(SETTINGS_SLUG);
          }}
          aria-label={settingsSection.title}
          aria-current={settingsInView ? "page" : undefined}
          className={`group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 active:scale-90 ${
            settingsInView || settingsHasActiveRoute
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Settings
            sx={{ fontSize: 18 }}
            className={`transition-transform duration-500 ${
              settingsInView ? "rotate-90" : "group-hover:rotate-45"
            }`}
          />
        </button>
      )}
    </div>
  );

  // ── Content ───────────────────────────────────────────────────────
  const content = (
    <>
      {renderHeader()}

      <nav className="scrollbar-hide flex-1 overflow-y-auto px-2.5 py-3">
        <div
          key={
            searching
              ? "__search"
              : currentParentLink
                ? `__children:${currentParentLink.href}`
                : currentSection
                  ? currentSection.slug
                  : "root"
          }
          className={viewAnimClass}
        >
          {searching
            ? renderSearch()
            : currentParentLink && currentSection
              ? renderChildren(currentSection, currentParentLink)
              : currentSection
                ? renderSection(currentSection)
                : renderRoot()}
        </div>
      </nav>

      {renderFooter()}

      <style jsx>{`
        @keyframes viewForward {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes viewBack {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes viewFade {
          from {
            opacity: 0;
            transform: translateY(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes staggerIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes badgePop {
          0% {
            transform: scale(0.7);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .view-enter-forward {
          animation: viewForward 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .view-enter-back {
          animation: viewBack 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .view-enter-fade {
          animation: viewFade 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .stagger-item {
          animation: staggerIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .badge-pop {
          animation: badgePop 180ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </>
  );

  if (isLargeScreen) {
    return (
      <aside className="relative flex h-full w-64 flex-col overflow-hidden border-r border-border/60 bg-background text-foreground">
        {content}
      </aside>
    );
  }

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
