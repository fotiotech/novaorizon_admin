// app/promotions/create/page.tsx

import { PromotionForm } from "@/app/(marketing)/components/PromotionForm";
import { getPromotionOptions, createPromotion } from "@/app/actions/promotion";


export default async function CreatePromotionPage() {
  const options = await getPromotionOptions();

  async function handleCreate(data: any) {
    'use server';
    await createPromotion(data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create Promotion</h1>
      <PromotionForm options={options} onSubmit={handleCreate} />
    </div>
  );
}