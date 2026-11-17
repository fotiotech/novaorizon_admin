// app/actions/seo.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { revalidatePath } from "next/cache";
import { apiData, apiFetch } from "@/lib/server-api";
import {
  DEFAULT_SEO,
  type SeoForm,
  type RobotsValue,
} from "@/app/lib/seo-defaults";

function normalizeRobots(value: unknown): RobotsValue {
  return value === "noindex,nofollow" ? "noindex,nofollow" : "index,follow";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export async function getSeoSetting(): Promise<SeoForm> {
  await requireAdmin();
  const doc: any = await apiData<any>("/seo");

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

export async function saveSeoSetting(input: SeoForm) {
  await requireAdmin();
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

    await apiFetch("/seo", { method: "PATCH", body: data });

    revalidatePath("/marketing/seo");
    revalidatePath("/");

    return { success: true as const };
  } catch (err) {
    console.error("[Seo] save failed:", err);
    return {
      success: false as const,
      error:
        err instanceof Error ? err.message : "Failed to save SEO settings.",
    };
  }
}
