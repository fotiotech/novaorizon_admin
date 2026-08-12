"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AttributesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // Sub‑navigation links for attribute management
  const subNavLinks = [
    { name: "Attributes", href: "/catalog/attributes" },
    { name: "Sets", href: "/catalog/attributes/sets" },
    { name: "Groups", href: "/catalog/attributes/group" },
    { name: "Units", href: "/catalog/attributes/units" },
  ];

  return (
    <div>
      {/* Secondary horizontal navigation (pill style) */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap gap-2 py-2">
          {subNavLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
