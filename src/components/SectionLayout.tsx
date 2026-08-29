// src/components/SectionLayout.tsx
"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SectionLink {
  name: string;
  href: string;
  icon?: ReactNode;
}

interface SectionLayoutProps {
  title: string;
  children: ReactNode;
  links?: SectionLink[]; // optional sub‑navigation links
}

const SectionLayout: React.FC<SectionLayoutProps> = ({
  title,
  children,
  links = [],
}) => {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>

        {/* Sub‑navigation (tabs) */}
        {links.length > 0 && (
          <nav className="mt-4 flex flex-wrap gap-1 border-b border-border">
            {links.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    isActive
                      ? "bg-card text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.icon && (
                    <span className="mr-2 inline-block">{link.icon}</span>
                  )}
                  {link.name}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Content container */}
      <div className="text-card-foreground">{children}</div>
    </div>
  );
};

export default SectionLayout;
