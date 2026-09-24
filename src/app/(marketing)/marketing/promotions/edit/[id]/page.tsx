// app/marketing/promotions/edit/[id]/page.tsx
import { DynamicPromotionForm } from "@/app/(marketing)/components/PromotionForm";
import {
  getPromotion,
  updatePromotion,
  getPromotionOptions,
} from "@/app/actions/promotion";
import { listPromotionTypes } from "@/app/actions/promotionType";
import { notFound } from "next/navigation";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionPage(props: EditPageProps) {
  const { id } = await props.params;

  const [promotion, { data: promotionTypes }, options] = await Promise.all([
    getPromotion(id),
    listPromotionTypes({ isActive: true }, { limit: 100 }),
    getPromotionOptions(),
  ]);

  if (!promotion) {
    notFound();
  }

  // Populated refs → string IDs, so the form can bind them.
  const initialValues = {
    ...(promotion as any),
    promotionTypeId:
      typeof (promotion as any).promotionTypeId === "object"
        ? ((promotion as any).promotionTypeId?._id?.toString() ?? "")
        : ((promotion as any).promotionTypeId?.toString() ?? ""),
    customerEligibility: {
      allCustomers:
        (promotion as any).customerEligibility?.allCustomers ?? true,
      customerGroupIds: (
        (promotion as any).customerEligibility?.customerGroupIds ?? []
      ).map((g: any) =>
        typeof g === "object" ? g?._id?.toString() : g?.toString(),
      ),
      minOrderAmount:
        (promotion as any).customerEligibility?.minOrderAmount ?? 0,
    },
    exclusiveWith: ((promotion as any).exclusiveWith ?? []).map((p: any) =>
      typeof p === "object" ? p?._id?.toString() : p?.toString(),
    ),
  };

  const otherPromotions = options.promotions.filter((p) => p.value !== id);

  async function handleUpdate(data: any) {
    "use server";
    await updatePromotion(id, data);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <DynamicPromotionForm
        promotionTypes={promotionTypes as any}
        customerGroups={options.customerGroups}
        otherPromotions={otherPromotions}
        initialValues={initialValues}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
