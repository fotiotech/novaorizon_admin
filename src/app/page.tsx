"use client";

import { rawMenuConfig } from "@/components/AdminSideBar";
import Link from "next/link";

// Helper to slugify a section title
const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens

export default function OverviewPage() {
  // Build sections with prefixed links and a section icon (from first link)
  const sectionsWithView = rawMenuConfig.map((section) => {
    const slug = slugify(section.title);
    // Prefix every link's href with the section slug
    const prefixedLinks = section.links.map((link) => ({
      ...link,
      href: `/${slug}${link.href}`,
    }));
    // Use the first link's icon as the section icon (or a fallback)
    const icon = prefixedLinks[0]?.icon || null;
    // The "View" link points to the first prefixed link
    const viewLink = prefixedLinks[0]?.href || "#";

    return {
      ...section,
      slug,
      icon,
      viewLink,
      links: prefixedLinks,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Quick access to all modules and key metrics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sectionsWithView.map((section: any) => (
          <div
            key={section.title}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100 dark:border-gray-700 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  {section.icon}
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {section.title}
                </h2>
              </div>
              <Link
                href={section.viewLink}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View
              </Link>
            </div>

            {/* Stats mock – you can replace with real data */}
            {section.stats && (
              <div className="mt-1 mb-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {section.stats.value}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {section.stats.label}
                </span>
              </div>
            )}

            {/* Quick links (first 3) */}
            <div className="mt-2 space-y-1 text-sm">
              {section.links.slice(0, 3).map((link: any) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                >
                  • {link.name}
                </Link>
              ))}
              {section.links.length > 3 && (
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  + {section.links.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
