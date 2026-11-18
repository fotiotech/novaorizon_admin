// app/marketing/promotions/create/page.tsx
//
// Server component: the promotion composer's option payload is loaded on the
// server (BFF -> GET /api/promotions/options) and handed to the client page,
// which keeps every interactive/mutation path browser-side.
import { apiData } from "@/lib/server-api";
import type { PromotionOptions } from "@/lib/api/promotion";
import CreatePromotionClient from "./_component/CreatePromotionClient";

export const dynamic = "force-dynamic";

function normalizeOptions(
  raw: Partial<PromotionOptions> | null | undefined,
): PromotionOptions {
  return {
    customerGroups: Array.isArray(raw?.customerGroups) ? raw.customerGroups : [],
    promotions: Array.isArray(raw?.promotions) ? raw.promotions : [],
    products: Array.isArray(raw?.products) ? raw.products : [],
    categories: Array.isArray(raw?.categories) ? raw.categories : [],
    brands: Array.isArray(raw?.brands) ? raw.brands : [],
  };
}

export default async function CreatePromotionPage() {
  let initialOptions: PromotionOptions | null = null;
  let initialError: string | null = null;

  try {
    const data = await apiData<Partial<PromotionOptions>>(
      "/promotions/options",
      { cache: "no-store" },
    );
    initialOptions = normalizeOptions(data);
  } catch (error) {
    console.error("[promotions create page] failed to load options:", error);
    initialError =
      error instanceof Error
        ? error.message
        : "Failed to load promotion options.";
  }

  return (
    <CreatePromotionClient
      initialOptions={initialOptions}
      initialError={initialError}
    />
  );
}
