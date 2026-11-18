// app/marketing/promotions/edit/[id]/page.tsx
//
// Server component: the promotion and the composer options are loaded in
// parallel on the server (BFF -> GET /api/promotions/:id + /promotions/options)
// and handed to the client composer, which only handles edits/submits.
import { notFound } from "next/navigation";
import { apiData } from "@/lib/server-api";
import type { PromotionOptions } from "@/lib/api/promotion";
import EditPromotionClient from "./_component/EditPromotionClient";

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionPage({ params }: PageProps) {
  const { id } = await params;

  const [promotionResult, optionsResult] = await Promise.allSettled([
    apiData<any>("/promotions/" + encodeURIComponent(id), {
      cache: "no-store",
    }),
    apiData<Partial<PromotionOptions>>("/promotions/options", {
      cache: "no-store",
    }),
  ]);

  const promotion =
    promotionResult.status === "fulfilled" ? promotionResult.value : null;
  const options =
    optionsResult.status === "fulfilled"
      ? normalizeOptions(optionsResult.value)
      : null;

  let initialError: string | null = null;

  if (promotionResult.status === "rejected") {
    console.error(
      "[promotions edit page] failed to load promotion:",
      promotionResult.reason,
    );
  }

  if (optionsResult.status === "rejected") {
    console.error(
      "[promotions edit page] failed to load options:",
      optionsResult.reason,
    );
    initialError =
      optionsResult.reason instanceof Error
        ? optionsResult.reason.message
        : "Failed to load promotion options.";
  }

  // Missing promotion + working options → a real not-found page.
  if (!promotion && !initialError) notFound();

  return (
    <EditPromotionClient
      promotionId={id}
      promotion={promotion}
      options={options}
      initialError={initialError}
    />
  );
}
