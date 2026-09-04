"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { name: "Pages", href: "/channels/store/pages" },
  { name: "Posts", href: "/channels/store/posts" },
  { name: "Media", href: "/channels/store/media" },
  { name: "Blog", href: "/channels/store/blog" },
  { name: "Tags", href: "/channels/store/tags" },
  { name: "FAQs", href: "/channels/store/faqs" },
];

function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border 
        p-5 box-border overflow-hidden transition-all duration-300 ease-in-out
        ${isOpen ? "w-64" : "w-0"}
        flex-shrink-0
      `}
    >
      <div className="w-64 h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-bold text-sidebar-foreground">
            Content
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            aria-label="Close sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={isActive ? "activeLink" : "inactiveLink"}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <main className="min-w-0 flex-1 p-3 box-border sm:p-5 lg:p-6">
        <header className="mb-5 flex flex-col items-start justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="rounded-md p-1.5 transition-colors hover:bg-muted"
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
            <h1 className="m-0 text-lg font-semibold sm:text-xl">
              Content Management
            </h1>
          </div>
          <div className="text-sm text-muted-foreground">Admin</div>
        </header>
        <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
          {children}
        </section>
      </main>
    </div>
  );
}
