// app/marketing/promotions/create/_component/CreatePromotionClient.tsx
"use client";

import { createPromotion } from "@/lib/api/promotion";
import type { PromotionOptions } from "@/lib/api/promotion";
import { PromotionComposer } from "@/app/(root)/marketing/components/PromotionComposer";

export default function CreatePromotionClient({
  initialOptions,
  initialError = null,
}: {
  initialOptions: PromotionOptions | null;
  initialError?: string | null;
}) {
  if (initialError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6">
        <p className="text-[13px] text-destructive">{initialError}</p>
      </div>
    );
  }

  if (!initialOptions) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6">
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6">
      <PromotionComposer
        customerGroups={initialOptions.customerGroups}
        otherPromotions={initialOptions.promotions}
        products={initialOptions.products}
        categories={initialOptions.categories}
        brands={initialOptions.brands}
        onSubmit={createPromotion}
      />
    </div>
  );
}
