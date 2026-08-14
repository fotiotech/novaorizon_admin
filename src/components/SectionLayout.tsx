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
    <div className="">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {title}
        </h1>

        {/* Sub‑navigation (tabs) */}
        {links.length > 0 && (
          <nav className="mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
            {links.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    isActive
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
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

      <div className=" dark:bg-gray-900 rounded-lg shadow-sm p-2 lg:p-6">
        {children}
      </div>
    </div>
  );
};

export default SectionLayout;
