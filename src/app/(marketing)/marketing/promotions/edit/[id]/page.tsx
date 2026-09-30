// app/marketing/promotions/edit/[id]/page.tsx
import { PromotionComposer } from "@/app/(marketing)/components/PromotionComposer";
import {
  getPromotion,
  getPromotionOptions,
  updatePromotion,
} from "@/app/actions/promotion";
import { notFound } from "next/navigation";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

/** Coerce an array of ObjectIds OR populated docs → string IDs. */
function toIdList(arr: any[] | undefined | null): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) =>
    x && typeof x === "object" && "_id" in x ? String(x._id) : String(x),
  );
}

export default async function EditPromotionPage(props: EditPageProps) {
  const { id } = await props.params;

  const [promotion, options] = await Promise.all([
    getPromotion(id).catch(() => null),
    getPromotionOptions(),
  ]);

  if (!promotion) notFound();

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
    calculationType:
      p.promotionType?.calculationType ?? ("percentage" as const),
    propertyValues,
    scope: {
      appliesTo: p.scope?.appliesTo ?? "all",
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

  const otherPromotions = options.promotions.filter((x) => x.value !== id);

  async function handleUpdate(data: any) {
    "use server";
    return updatePromotion(id, data);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <PromotionComposer
        initialValues={initialValues}
        customerGroups={options.customerGroups}
        otherPromotions={otherPromotions}
        products={options.products}
        categories={options.categories}
        brands={options.brands}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
