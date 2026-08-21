// app/promotion-types/create/page.tsx

import { PromotionTypeForm } from "@/app/(marketing)/components/PromotionTypeForm";
import { listPromotionTypeProperties, createPromotionType } from "@/app/actions/promotionType";


export default async function CreatePromotionTypePage() {
  // Fetch all available properties for the multi-select
  const { data: properties } = await listPromotionTypeProperties({}, { limit: 100 });

  const availableProperties = properties.map((p:any) => ({
    label: `${p.name} (${p.code})`,
    value: p._id.toString(),
  }));

  async function handleCreate(data: any) {
    'use server';
    await createPromotionType(data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create Promotion Type</h1>
      <PromotionTypeForm
        availableProperties={availableProperties}
        onSubmit={handleCreate}
      />
    </div>
  );
}