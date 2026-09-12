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
  links?: SectionLink[]; // optional sub-navigation links
}

const SectionLayout: React.FC<SectionLayoutProps> = ({
  title,
  children,
  links = [],
}) => {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {title}
        </h1>

        {/* Sub-navigation (tabs) — single row, scrolls horizontally on overflow */}
        {links.length > 0 && (
          <nav
            className="
              mt-2 flex flex-nowrap items-stretch gap-1
              border-b border-border
              overflow-x-auto overflow-y-hidden
              scrollbar-thin scrollbar-thumb-border
              [-ms-overflow-style:none] [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {links.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
                    isActive
                      ? "bg-card text-primary border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted border-b-2 border-transparent"
                  }`}
                >
                  {link.icon && (
                    <span className="mr-1.5 inline-flex items-center">
                      {link.icon}
                    </span>
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
