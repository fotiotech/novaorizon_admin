// app/promotions/create/page.tsx

import { DynamicPromotionForm } from "@/app/(marketing)/components/PromotionForm";
import { createPromotion } from "@/app/actions/promotion";
import { listPromotionTypes } from "@/app/actions/promotionType";


export default async function CreatePromotionPage() {
  const { data: types } = await listPromotionTypes({ isActive: true }, { limit: 100 });

  async function handleCreate(data: any) {
    'use server';
    await createPromotion(data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create Promotion</h1>
      <DynamicPromotionForm promotionTypes={types as any} onSubmit={handleCreate} />
    </div>
  );
}