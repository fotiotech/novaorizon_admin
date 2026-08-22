"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { name: "App", href: "/content/app" },
  { name: "Pages", href: "/content/pages" },
  { name: "Posts", href: "/content/posts" },
  { name: "Media", href: "/content/media" },
  { name: "Blog", href: "/content/blog" },
  { name: "Tags", href: "/content/tags" },
  { name: "FAQs", href: "/content/faqs" },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white p-5 box-border">
      <div className="text-lg font-bold mb-4">Content</div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50 p-6 box-border">
        <header className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-semibold m-0">Content Management</h1>
          <div className="text-slate-600">Admin</div>
        </header>
        <section className="bg-white rounded-lg p-4 shadow-sm">{children}</section>
      </main>
    </div>
  );
}