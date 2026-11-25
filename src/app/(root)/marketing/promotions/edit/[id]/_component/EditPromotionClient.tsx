// app/marketing/promotions/edit/[id]/_component/EditPromotionClient.tsx
"use client";

import { PromotionComposer } from "@/app/(root)/marketing/components/PromotionComposer";
import { updatePromotion } from "@/lib/api/promotion";
import type { PromotionOptions } from "@/lib/api/promotion";

/** Coerce an array of ObjectIds OR populated docs → string IDs. */
function toIdList(arr: any[] | undefined | null): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) =>
    x && typeof x === "object" && "_id" in x ? String(x._id) : String(x),
  );
}

export default function EditPromotionClient({
  promotionId,
  promotion,
  options,
  initialError = null,
}: {
  promotionId: string;
  promotion: any | null;
  options: PromotionOptions | null;
  initialError?: string | null;
}) {
  if (initialError) {
    return (
      <div className="mx-auto w-full max-w-3xl sm:px-6">
        <p className="text-[13px] text-destructive">{initialError}</p>
      </div>
    );
  }

  if (!promotion || !options) {
    return (
      <div className="mx-auto w-full max-w-3xl sm:px-6">
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const p: any = promotion;

  // Normalise Map → plain object; drop empty entries so the form
  // doesn't render stray blank inputs.
  const propertyValues: Record<string, any> = {};
  if (p.propertyValues) {
    const entries: Array<[string, any]> =
      p.propertyValues instanceof Map
        ? Array.from(p.propertyValues.entries() as Iterable<[string, any]>)
        : Object.entries(p.propertyValues as Record<string, any>);

    for (const [k, v] of entries) {
      if (v !== undefined && v !== null && v !== "") {
        propertyValues[k] = v;
      }
    }
  }

  const initialValues = {
    name: p.name ?? "",
    code: p.code ?? "",
    description: p.description ?? "",
    startDate: p.startDate
      ? new Date(p.startDate).toISOString().slice(0, 16)
      : "",
    endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 16) : "",
    isActive: p.isActive ?? true,
    priority: p.priority ?? 0,
    offerId: p.offerId ? String(p.offerId) : "",
    calculationType:
      p.promotionType?.calculationType ?? ("percentage" as const),
    propertyValues,
    scope: {
      appliesTo: p.scope?.appliesTo ?? "all",
      match: (p.scope?.match === "any" ? "any" : "all") as
        | "all"
        | "any",
      rules: Array.isArray(p.scope?.rules) ? p.scope.rules : [],
      productIds: toIdList(p.scope?.productIds),
      categoryIds: toIdList(p.scope?.categoryIds),
      brandIds: toIdList(p.scope?.brandIds),
      excludeProductIds: toIdList(p.scope?.excludeProductIds),
    },
    customerEligibility: {
      allCustomers: p.customerEligibility?.allCustomers ?? true,
      customerGroupIds: toIdList(p.customerEligibility?.customerGroupIds),
      minOrderAmount: p.customerEligibility?.minOrderAmount ?? 0,
    },
    usageLimits: {
      totalUses: p.usageLimits?.totalUses ?? null,
      perCustomer: p.usageLimits?.perCustomer ?? null,
      perOrder: p.usageLimits?.perOrder ?? 1,
    },
    stackable: p.stackable ?? false,
    exclusiveWith: toIdList(p.exclusiveWith),
  };

  const otherPromotions = options.promotions.filter(
    (x) => x.value !== promotionId,
  );

  return (
    <div className="mx-auto w-full max-w-3xl sm:px-6">
      <PromotionComposer
        initialValues={initialValues}
        customerGroups={options.customerGroups}
        otherPromotions={otherPromotions}
        products={options.products}
        categories={options.categories}
        brands={options.brands}
        offers={options.offers}
        onSubmit={(data: any) => updatePromotion(promotionId, data)}
      />
    </div>
  );
}