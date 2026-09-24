// app/marketing/promotions/create/page.tsx
import { DynamicPromotionForm } from "@/app/(marketing)/components/PromotionForm";
import { createPromotion, getPromotionOptions } from "@/app/actions/promotion";
import { listPromotionTypes } from "@/app/actions/promotionType";

export default async function CreatePromotionPage() {
  const [{ data: promotionTypes }, options] = await Promise.all([
    listPromotionTypes({ isActive: true }, { limit: 100 }),
    getPromotionOptions(),
  ]);

  async function handleCreate(data: any) {
    "use server";
    await createPromotion(data);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <DynamicPromotionForm
        promotionTypes={promotionTypes as any}
        customerGroups={options.customerGroups}
        otherPromotions={options.promotions}
        onSubmit={handleCreate}
      />
    </div>
  );
}
