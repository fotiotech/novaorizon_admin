// lib/api/seo.ts
import api from "@/lib/api";
import {
  DEFAULT_SEO,
  type SeoForm,
  type RobotsValue,
} from "@/app/lib/seo-defaults";

/**
 * SEO settings live in the Express backend (`/api/seo`).
 * Client-side replacement for the old `app/actions/seo.ts`.
 */

function normalizeRobots(value: unknown): RobotsValue {
  return value === "noindex,nofollow" ? "noindex,nofollow" : "index,follow";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** GET /api/seo — public. Falls back to the shared defaults. */
export async function getSeoSetting(): Promise<SeoForm> {
  const res = await api.get<{ data: any }>("/seo");
  const doc = res.data?.data;

  if (!doc) return DEFAULT_SEO;

  return {
    siteName: asString(doc.siteName, DEFAULT_SEO.siteName),
    title: asString(doc.title, DEFAULT_SEO.title),
    description: asString(doc.description, DEFAULT_SEO.description),
    keywords: asString(doc.keywords, DEFAULT_SEO.keywords),
    canonicalUrl: asString(doc.canonicalUrl, DEFAULT_SEO.canonicalUrl),
    ogImage: asString(doc.ogImage, DEFAULT_SEO.ogImage),
    robots: normalizeRobots(doc.robots),
  };
}

/** PATCH /api/seo — admin only. */
export async function saveSeoSetting(
  input: SeoForm,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const data = {
      siteName: (input.siteName ?? "").trim(),
      title: (input.title ?? "").trim(),
      description: (input.description ?? "").trim(),
      keywords: (input.keywords ?? "").trim(),
      canonicalUrl: (input.canonicalUrl ?? "").trim(),
      ogImage: (input.ogImage ?? "").trim(),
      robots: normalizeRobots(input.robots),
    };

    await api.patch("/seo", data);

    return { success: true };
  } catch (err: any) {
    console.error("[Seo] save failed:", err);
    return {
      success: false,
      error:
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to save SEO settings."),
    };
  }
}
