// app/actions/sitemap-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import SitemapSettingsModel from "@/models/SitemapSettings";
import SitemapLogModel from "@/models/SitemapLog";
import ProductModel from "@/models/Product";
import CategoryModel from "@/models/Category";
import {
  SitemapSettings,
  SitemapLog,
  SitemapUrl,
  SitemapGenerationResult,
  SearchEngineSubmissionResult,
  SettingsUpdateResult,
  ExcludedUrl,
  PrioritySettings,
  SearchEnginePing,
} from "@/constant/types/sitemap";
import { connection } from "@/utils/connection";

// Get current sitemap settings
export async function getSitemapSettings(): Promise<SitemapSettings | null> {
  try {
    await connection();

    let settings = await SitemapSettingsModel.findOne();

    if (!settings) {
      // Create default settings if none exist
      settings = await SitemapSettingsModel.create({});
    }

    return JSON.parse(JSON.stringify(settings)) as SitemapSettings;
  } catch (error) {
    console.error("Error fetching sitemap settings:", error);
    return null;
  }
}

// Update sitemap settings
export async function updateSitemapSettings(
  formData: FormData
): Promise<SettingsUpdateResult> {
  try {
    await connection();

    const autoRegenerate = formData.get("autoRegenerate");
    const changeFrequency = formData.get("changeFrequency");
    const prioritySettings = formData.get("prioritySettings");
    const searchEnginePing = formData.get("searchEnginePing");
    const excludedUrls = formData.get("excludedUrls");

    // Validate required fields
    if (
      !changeFrequency ||
      !prioritySettings ||
      !searchEnginePing ||
      !excludedUrls
    ) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    // Parse JSON data with type safety
    let parsedPrioritySettings: PrioritySettings;
    let parsedSearchEnginePing: SearchEnginePing;
    let parsedExcludedUrls: ExcludedUrl[];

    try {
      parsedPrioritySettings = JSON.parse(
        prioritySettings as string
      ) as PrioritySettings;
      parsedSearchEnginePing = JSON.parse(
        searchEnginePing as string
      ) as SearchEnginePing;
      parsedExcludedUrls = JSON.parse(excludedUrls as string) as ExcludedUrl[];
    } catch (parseError) {
      return {
        success: false,
        error: "Invalid JSON data in form fields",
      };
    }

    // Validate change frequency
    const validChangeFrequencies = [
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ] as const;
    if (!validChangeFrequencies.includes(changeFrequency as any)) {
      return {
        success: false,
        error: "Invalid change frequency value",
      };
    }

    const updateData: Partial<SitemapSettings> = {
      autoRegenerate: autoRegenerate === "true",
      changeFrequency: changeFrequency as SitemapSettings["changeFrequency"],
      prioritySettings: parsedPrioritySettings,
      searchEnginePing: parsedSearchEnginePing,
      excludedUrls: parsedExcludedUrls,
    };

    const updatedSettings = await SitemapSettingsModel.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true }
    );

    // Log the action
    await SitemapLogModel.create({
      action: "updated_settings",
      details: "Sitemap settings updated",
      triggeredBy: "admin",
    } as SitemapLog);

    revalidatePath("/admin/sitemap");
    return {
      success: true,
      settings: JSON.parse(JSON.stringify(updatedSettings)) as SitemapSettings,
    };
  } catch (error) {
    console.error("Error updating sitemap settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Generate sitemap
export async function generateSitemap(): Promise<SitemapGenerationResult> {
  try {
    await connection();
    const startTime = Date.now();

    // Get current settings
    const settings = await SitemapSettingsModel.findOne();

    // Fetch all public content with proper typing
    const [products, categories] = await Promise.all([
      ProductModel.find({ status: "published", visibility: "public" }),
      CategoryModel.find({ status: "active" }),
    ]);

    // Generate sitemap URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const urls: SitemapUrl[] = [];

    // Homepage
    urls.push({
      url: baseUrl,
      priority: settings?.prioritySettings?.home || 1.0,
      changeFreq: settings?.changeFrequency || "weekly",
      lastMod: new Date().toISOString(),
    });

    // Products
    products.forEach((product: any) => {
      const productUrl = `/products/${product.slug}`;
      if (!isUrlExcluded(productUrl, settings?.excludedUrls)) {
        urls.push({
          url: `${baseUrl}${productUrl}`,
          priority: settings?.prioritySettings?.products || 0.8,
          changeFreq: "weekly",
          lastMod: product.updatedAt.toISOString(),
        });
      }
    });

    // Categories
    categories.forEach((category: any) => {
      const categoryUrl = `/category/${category.slug}`;
      if (!isUrlExcluded(categoryUrl, settings?.excludedUrls)) {
        urls.push({
          url: `${baseUrl}${categoryUrl}`,
          priority: settings?.prioritySettings?.categories || 0.7,
          changeFreq: "monthly",
          lastMod: category.updatedAt.toISOString(),
        });
      }
    });

    // Update settings with generation info
    await SitemapSettingsModel.findOneAndUpdate(
      {},
      {
        lastGenerated: new Date(),
        urlsCount: urls.length,
      },
      { upsert: true }
    );

    // Log the generation
    const duration = Date.now() - startTime;
    await SitemapLogModel.create({
      action: "generated",
      details: `Generated sitemap with ${urls.length} URLs`,
      urlsCount: urls.length,
      duration,
      triggeredBy: "admin",
    } as SitemapLog);

    return {
      success: true,
      urlsCount: urls.length,
      duration,
    };
  } catch (error) {
    console.error("Error generating sitemap:", error);

    await SitemapLogModel.create({
      action: "error",
      details: "Failed to generate sitemap",
      error: error instanceof Error ? error.message : "Unknown error",
      triggeredBy: "admin",
    } as SitemapLog);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Submit sitemap to search engines
export async function submitToSearchEngines(): Promise<SearchEngineSubmissionResult> {
  try {
    await connection();

    const settings = await SitemapSettingsModel.findOne();
    const sitemapUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`;
    const results: Array<{ engine: string; success: boolean; error?: string }> =
      [];

    // Ping Google
    if (settings?.searchEnginePing?.google) {
      try {
        const googleResponse = await fetch(
          `https://www.google.com/ping?sitemap=${encodeURIComponent(
            sitemapUrl
          )}`
        );
        results.push({
          engine: "Google",
          success: googleResponse.ok,
        });
      } catch (error) {
        results.push({
          engine: "Google",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Ping Bing
    if (settings?.searchEnginePing?.bing) {
      try {
        const bingResponse = await fetch(
          `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
        );
        results.push({
          engine: "Bing",
          success: bingResponse.ok,
        });
      } catch (error) {
        results.push({
          engine: "Bing",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log the submission
    await SitemapLogModel.create({
      action: "submitted",
      details: `Submitted sitemap to search engines: ${
        results.filter((r) => r.success).length
      }/${results.length} successful`,
      triggeredBy: "admin",
    } as SitemapLog);

    return { success: true, results };
  } catch (error) {
    console.error("Error submitting to search engines:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Get sitemap generation logs
export async function getSitemapLogs(
  limit: number = 10
): Promise<SitemapLog[]> {
  try {
    await connection();

    const logs = await SitemapLogModel.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    return JSON.parse(JSON.stringify(logs)) as SitemapLog[];
  } catch (error) {
    console.error("Error fetching sitemap logs:", error);
    return [];
  }
}

// Helper function to check if URL is excluded
function isUrlExcluded(url: string, excludedUrls: ExcludedUrl[] = []): boolean {
  if (!excludedUrls.length) return false;

  return excludedUrls.some((excluded: ExcludedUrl) => {
    if (excluded.pattern) {
      try {
        const regex = new RegExp(excluded.pattern);
        return regex.test(url);
      } catch (error) {
        console.error("Invalid regex pattern:", excluded.pattern);
        return false;
      }
    }
    return excluded.url === url;
  });
}
