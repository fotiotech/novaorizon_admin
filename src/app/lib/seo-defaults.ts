// lib/seo-defaults.ts
// Shared, non-server module. Safe to import from both client and server.

export type RobotsValue = "index,follow" | "noindex,nofollow";

export interface SeoForm {
  siteName: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  robots: RobotsValue;
}

export const DEFAULT_SEO: SeoForm = {
  siteName: "Nova Horizon",
  title: "Nova Horizon | Discover what’s next",
  description:
    "Explore Nova Horizon for fresh ideas, helpful resources, and inspiring stories.",
  keywords: "nova horizon, resources, stories, ideas",
  canonicalUrl: "https://www.example.com",
  ogImage: "https://www.example.com/og-image.jpg",
  robots: "index,follow",
};
