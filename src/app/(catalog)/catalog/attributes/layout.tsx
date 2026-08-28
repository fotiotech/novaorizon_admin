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

  const subNavLinks = [
    { name: "Attributes", href: "/catalog/attributes" },
    { name: "Sets", href: "/catalog/attributes/sets" },
    { name: "Groups", href: "/catalog/attributes/groups" },
    { name: "Units", href: "/catalog/attributes/units" },
  ];

  return (
    <div>
      {/* Secondary horizontal navigation (pill style) */}
      <div className="mb-6 border-b border-border">
        <nav className="flex flex-wrap gap-2 py-2">
          {subNavLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
