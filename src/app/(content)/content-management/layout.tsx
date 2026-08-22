"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { name: "App", href: "/content-management/app" },
  { name: "Pages", href: "/content-management/pages" },
  { name: "Posts", href: "/content-management/posts" },
  { name: "Media", href: "/content-management/media" },
  { name: "Blog", href: "/content-management/blog" },
  { name: "Tags", href: "/content-management/tags" },
  { name: "FAQs", href: "/content-management/faqs" },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-5 box-border h-screen sticky top-0 overflow-y-auto">
      <div className="text-lg font-bold mb-4 text-sidebar-foreground">
        Content
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? "activeLink" : "inactiveLink"}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-6 box-border">
        <header className="flex justify-between items-center mb-5 pb-3 border-b border-border">
          <h1 className="text-xl font-semibold m-0">Content Management</h1>
          <div className="text-muted-foreground">Admin</div>
        </header>
        <section className="bg-card rounded-lg p-4 shadow-sm border border-border">
          {children}
        </section>
      </main>
    </div>
  );
}
