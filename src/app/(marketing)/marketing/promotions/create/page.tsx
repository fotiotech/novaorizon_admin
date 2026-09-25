// app/marketing/promotions/create/page.tsx
import { createPromotion, getPromotionOptions } from "@/app/actions/promotion";
import { listProducts } from "@/app/actions/products";
import { PromotionComposer } from "@/app/(marketing)/components/PromotionComposer";

export default async function CreatePromotionPage() {
  const [options, productsResult] = await Promise.all([
    getPromotionOptions(),
    listProducts({}, { limit: 500 }).catch(() => ({ data: [] })),
  ]);

  const products = (productsResult?.data ?? []).map((p: any) => ({
    label: p.name,
    value: p._id.toString(),
  }));

  async function handleCreate(data: any) {
    "use server";
    return createPromotion(data);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <PromotionComposer
        customerGroups={options.customerGroups}
        otherPromotions={options.promotions}
        products={products}
        onSubmit={handleCreate}
      />
    </div>
  );
}
