// components/AdminSideBar.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  ArrowForward,
  KeyboardReturn,
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

type SearchResult = {
  name: string;
  href: string;
  icon?: React.ReactNode;
  sectionTitle: string;
};

const itemBase =
  "group relative flex w-full items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors duration-150 ease-out";
const itemIdle =
  "text-sidebar-foreground/80 hover:bg-foreground/5 hover:text-sidebar-foreground";
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

  const [path, setPath] = useState<string[]>([]);
  const [direction, setDirection] = useState<Direction>("same");

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const resultsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
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

  useEffect(() => {
    if (!pathname) return;
    const owner = menuConfig.find(sectionHasActiveRoute);
    if (!owner) return;
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
    setSearchOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [searchOpen]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!searchOpen || !searching) return;
    const el =
      resultsListRef.current?.querySelector<HTMLElement>(
        `[data-active="true"]`,
      );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx, searchOpen, searching]);

  const openSearch = () => {
    setQuery("");
    setActiveIdx(0);
    setSearchOpen(true);
    setTimeout(() => overlayInputRef.current?.focus(), 30);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const navigate = (href: string) => {
    router.push(href);
    closeSearch();
    handleClose();
  };

  const openSection = (slug: string) => {
    setDirection("forward");
    setPath([slug]);
    closeSearch();
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

  const closeSidebar = () => {
    setSideBarToggle(false);
  };

  const handleClose = () => {
    if (screenSize <= 1024) setSideBarToggle(false);
  };

  const isLargeScreen = screenSize > 1024;

  const renderBadges = (link: MenuLink) => (
    <>
      {link.showUnreadCount && unreadCount > 0 && (
        <span className="badge-pop ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold leading-none text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      {link.showContactCount && newContactCount > 0 && (
        <span className="badge-pop ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold leading-none text-white">
          {newContactCount > 99 ? "99+" : newContactCount}
        </span>
      )}
      {link.showOrderCount && unreadOrderCount > 0 && (
        <span className="badge-pop ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold leading-none text-destructive-foreground">
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
    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
  );

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
              <span className="flex items-center gap-3.5">
                <span className="text-sidebar-foreground/60 [&>svg]:text-xl group-hover:text-sidebar-foreground">
                  {section.links[0]?.icon}
                </span>
                <span>{section.title}</span>
              </span>
              <ChevronRight
                sx={{ fontSize: 18 }}
                className="text-sidebar-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-sidebar-foreground/70"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );

  const renderSection = (section: MenuSection) => (
    <>
      <div className="mb-3 flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back to menu"
          className="-ml-1 rounded-md p-2 text-sidebar-foreground/60 transition-colors hover:bg-foreground/5 hover:text-sidebar-foreground active:scale-90"
        >
          <ArrowBack sx={{ fontSize: 18 }} />
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60"
        >
          <button
            type="button"
            onClick={goToRoot}
            className="flex items-center gap-1 transition-colors hover:text-sidebar-foreground"
          >
            <Home sx={{ fontSize: 15 }} />
            <span>Menu</span>
          </button>
          <ChevronRight sx={{ fontSize: 14 }} className="opacity-50" />
          <span className="truncate text-sidebar-foreground/90">
            {section.title}
          </span>
        </nav>
      </div>

      <ul className="space-y-0.5">
        {section.links.map((link, i) => {
          const isActive = linkHasActiveRoute(link);
          const hasChildren = (link.children?.length ?? 0) > 0;

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
                  <span className="flex items-center gap-3.5">
                    <span className="text-sidebar-foreground/60 [&>svg]:text-xl group-hover:text-sidebar-foreground">
                      {link.icon}
                    </span>
                    <span>{link.name}</span>
                  </span>
                  <ChevronRight
                    sx={{ fontSize: 18 }}
                    className="text-sidebar-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-sidebar-foreground/70"
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
                <span className="flex items-center gap-3.5">
                  <span className="text-sidebar-foreground/60 [&>svg]:text-xl group-hover:text-sidebar-foreground">
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

  const renderChildren = (section: MenuSection, parent: MenuLink) => {
    const children = parent.children ?? [];

    // Deepest match wins — same rule the flat index uses. A child's own
    // href beats the parent mirror's href on a deeper route, and the
    // parent mirror only lights up on the parent's exact URL.
    let bestHref = "";
    for (const c of children) {
      const hit =
        pathname === c.href ||
        (pathname ? pathname.startsWith(c.href + "/") : false);
      if (hit && c.href.length > bestHref.length) bestHref = c.href;
    }

    return (
      <>
        <div className="mb-3 flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-1 rounded-md p-2 text-sidebar-foreground/60 transition-colors hover:bg-foreground/5 hover:text-sidebar-foreground active:scale-90"
          >
            <ArrowBack sx={{ fontSize: 18 }} />
          </button>

          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60"
          >
            <button
              type="button"
              onClick={goToRoot}
              className="flex items-center gap-1 transition-colors hover:text-sidebar-foreground"
            >
              <Home sx={{ fontSize: 15 }} />
              <span>Menu</span>
            </button>
            <ChevronRight sx={{ fontSize: 14 }} className="opacity-50" />
            <button
              type="button"
              onClick={() => {
                setDirection("back");
                setPath([section.slug]);
              }}
              className="truncate transition-colors hover:text-sidebar-foreground"
            >
              {section.title}
            </button>
            <ChevronRight sx={{ fontSize: 14 }} className="opacity-50" />
            <span className="truncate text-sidebar-foreground/90">
              {parent.name}
            </span>
          </nav>
        </div>

        <ul className="space-y-0.5">
          {children.map((link, i) => {
            const isActive = link.href === bestHref;
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
                  <span className="flex items-center gap-3.5">
                    <span className="text-sidebar-foreground/60 [&>svg]:text-xl group-hover:text-sidebar-foreground">
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
  };

  const renderHeader = () => (
    <div className="shrink-0 p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={handleClose}
        >
          <div className="rounded-lg bg-primary/10 p-2">
            <Image src="/logo.png" alt="logo" width={32} height={22} />
          </div>
          <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
            Novaorizon
          </span>
        </Link>

        <button
          title="Close sidebar"
          type="button"
          onClick={closeSidebar}
          aria-label="Close sidebar"
          className="rounded-md p-2 text-sidebar-foreground/60 transition-colors hover:bg-foreground/5 hover:text-sidebar-foreground active:scale-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
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
      </div>

      {/* Search trigger — bg-card so it stands out against bg-sidebar */}
      <button
        type="button"
        onClick={openSearch}
        aria-label="Open search"
        className="flex w-full items-center gap-2.5 rounded-full bg-card px-3.5 py-2 text-left shadow-sm transition-colors duration-150 hover:bg-card/70 focus:outline-none focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <Search
          sx={{ fontSize: 17 }}
          className="shrink-0 text-muted-foreground/70"
        />
        <span className="min-w-0 flex-1 truncate text-[15px] text-muted-foreground/60">
          Search…
        </span>
        <kbd className="hidden shrink-0 items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium leading-none text-muted-foreground/70 md:inline-flex">
          ⌘K
        </kbd>
      </button>
    </div>
  );

  const settingsInView = currentSection?.slug === SETTINGS_SLUG;
  const settingsHasActiveRoute =
    settingsSection && sectionHasActiveRoute(settingsSection);

  const renderFooter = () => (
    <div className="flex shrink-0 items-center gap-2.5 px-3.5 py-3.5">
      {user ? (
        <Link
          href="/profile"
          onClick={handleClose}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/5"
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-sidebar-foreground/90">
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
          className={`group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 active:scale-90 ${
            settingsInView || settingsHasActiveRoute
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/70 hover:bg-foreground/5 hover:text-sidebar-foreground"
          }`}
        >
          <Settings
            sx={{ fontSize: 20 }}
            className={`transition-transform duration-500 ${
              settingsInView ? "rotate-90" : "group-hover:rotate-45"
            }`}
          />
        </button>
      )}
    </div>
  );

  const overlayKeyHandler = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
      return;
    }
    if (searching) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[activeIdx]) {
        e.preventDefault();
        navigate(results[activeIdx].href);
      }
    } else {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const total = mainSections.length;
        setActiveIdx((i) =>
          e.key === "ArrowDown"
            ? Math.min(i + 1, total - 1)
            : Math.max(i - 1, 0),
        );
      } else if (e.key === "Enter" && mainSections[activeIdx]) {
        e.preventDefault();
        openSection(mainSections[activeIdx].slug);
      }
    }
  };

  const renderOverlay = () => {
    if (!mounted || !searchOpen) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex flex-col sm:items-center sm:justify-start sm:p-4 sm:pt-[10vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Search menu"
      >
        <button
          type="button"
          aria-label="Close search"
          onClick={closeSearch}
          className="absolute inset-0 cursor-default bg-foreground/30 backdrop-blur-sm"
        />

        <div
          className="
            relative flex flex-1 flex-col overflow-hidden bg-card text-card-foreground
            shadow-sm
            sm:flex-none sm:h-auto sm:w-full sm:max-w-xl
            sm:max-h-[75vh] sm:rounded-xl
            sm:shadow-2xl
            search-panel-enter
          "
        >
          <div className="flex items-center gap-2.5 px-4 py-3.5">
            <Search
              sx={{ fontSize: 20 }}
              className="shrink-0 text-muted-foreground"
            />
            <input
              ref={overlayInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={overlayKeyHandler}
              placeholder="Search menu links…"
              aria-label="Search menu links"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="
                m-0 h-auto w-auto min-w-0 flex-1
                rounded-none border-0 bg-transparent p-0
                text-[17px] leading-none text-foreground
                placeholder:text-muted-foreground/60
                outline-none ring-0 shadow-none appearance-none
                focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none
                [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_transparent]
                [&:-webkit-autofill]:[-webkit-text-fill-color:inherit]
                [&:-webkit-autofill]:transition-[background-color_9999s]
              "
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  overlayInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            )}

            <button
              type="button"
              onClick={closeSearch}
              className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
            >
              Cancel
            </button>
          </div>

          <div
            ref={resultsListRef}
            className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5"
          >
            {!searching ? (
              <>
                <div className="mb-2 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <span>Browse sections</span>
                  <span className="ml-auto tabular-nums">
                    {mainSections.length}
                  </span>
                </div>

                <ul className="space-y-0.5">
                  {mainSections.map((section, i) => {
                    const isActive = activeIdx === i;
                    const hasActive = sectionHasActiveRoute(section);
                    return (
                      <li key={section.slug}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => openSection(section.slug)}
                          data-active={isActive ? "true" : "false"}
                          className={`${itemBase} ${
                            isActive
                              ? "bg-muted/70 text-foreground"
                              : hasActive
                                ? itemActive
                                : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                          } justify-between`}
                        >
                          {hasActive && <ActiveBar />}
                          <span className="flex items-center gap-3.5">
                            <span className="text-muted-foreground [&>svg]:text-xl group-hover:text-foreground">
                              {section.links[0]?.icon}
                            </span>
                            <span>{section.title}</span>
                          </span>
                          <ArrowForward
                            sx={{ fontSize: 16 }}
                            className="shrink-0 text-muted-foreground/50"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-4 px-3 text-xs text-muted-foreground/70">
                  Tip: start typing to search across every link.
                </p>
              </>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Search className="text-muted-foreground" />
                </div>
                <p className="text-[15px] font-medium text-foreground">
                  No matches for “{query}”
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Try a section name like{" "}
                  <span className="font-medium text-foreground/80">Orders</span>
                  ,{" "}
                  <span className="font-medium text-foreground/80">
                    Products
                  </span>
                  , or a URL fragment.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <span>Results</span>
                  <span className="ml-auto tabular-nums">{results.length}</span>
                </div>

                <ul className="space-y-0.5">
                  {results.map((r, i) => {
                    const isActive = activeIdx === i;
                    const isCurrent =
                      pathname === r.href || pathname?.startsWith(r.href);
                    return (
                      <li key={r.href}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => navigate(r.href)}
                          data-active={isActive ? "true" : "false"}
                          className={`${itemBase} ${
                            isActive
                              ? "bg-muted/70 text-foreground"
                              : isCurrent
                                ? itemActive
                                : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                          } justify-start`}
                        >
                          {isCurrent && <ActiveBar />}
                          <span className="shrink-0 text-muted-foreground [&>svg]:text-xl group-hover:text-foreground">
                            {r.icon}
                          </span>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-[15px] leading-tight">
                              {highlight(r.name, query)}
                            </p>
                            <p className="truncate text-xs font-normal text-muted-foreground">
                              {r.sectionTitle}
                            </p>
                          </div>
                          {isActive ? (
                            <KeyboardReturn
                              sx={{ fontSize: 16 }}
                              className="shrink-0 text-muted-foreground"
                            />
                          ) : (
                            <ChevronRight
                              sx={{ fontSize: 18 }}
                              className="shrink-0 text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="hidden items-center justify-between bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-2">
              <kbd className="rounded bg-background/70 px-1.5 py-0.5 text-[11px]">
                ↑
              </kbd>
              <kbd className="rounded bg-background/70 px-1.5 py-0.5 text-[11px]">
                ↓
              </kbd>
              navigate
              <kbd className="ml-2 rounded bg-background/70 px-1.5 py-0.5 text-[11px]">
                ⏎
              </kbd>
              open
              <kbd className="ml-2 rounded bg-background/70 px-1.5 py-0.5 text-[11px]">
                esc
              </kbd>
              close
            </span>
            <span>
              {searching
                ? `${results.length} result${results.length === 1 ? "" : "s"}`
                : `${mainSections.length} sections`}
            </span>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  const content = (
    <>
      {renderHeader()}

      <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-3.5">
        <div
          key={
            currentParentLink
              ? `__children:${currentParentLink.href}`
              : currentSection
                ? currentSection.slug
                : "root"
          }
          className={viewAnimClass}
        >
          {currentParentLink && currentSection
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

      {renderOverlay()}
    </>
  );

  if (isLargeScreen) {
    return (
      <aside
        aria-hidden={!sideBarToggle}
        className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-sm transition-[width] duration-300 ease-out ${
          sideBarToggle ? "w-64" : "w-0"
        }`}
      >
        {/* Inner wrapper keeps content at a fixed width so it doesn't
            reflow while the outer element animates. */}
        <div className="flex h-full w-64 flex-col">{content}</div>
      </aside>
    );
  }

  return (
    <LeftSheet
      open={sideBarToggle}
      onClose={() => setSideBarToggle(false)}
      width="w-3/4 max-w-xs"
    >
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        {content}
      </div>
    </LeftSheet>
  );
};

export default AdminSideBar;
