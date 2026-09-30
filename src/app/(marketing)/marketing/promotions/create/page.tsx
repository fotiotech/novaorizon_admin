// app/marketing/promotions/create/page.tsx
import { createPromotion, getPromotionOptions } from "@/app/actions/promotion";
import { PromotionComposer } from "@/app/(marketing)/components/PromotionComposer";

export default async function CreatePromotionPage() {
  const options = await getPromotionOptions();

  async function handleCreate(data: any) {
    "use server";
    return createPromotion(data);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <PromotionComposer
        customerGroups={options.customerGroups}
        otherPromotions={options.promotions}
        products={options.products}
        categories={options.categories}
        brands={options.brands}
        onSubmit={handleCreate}
      />
    </div>
  );
}
