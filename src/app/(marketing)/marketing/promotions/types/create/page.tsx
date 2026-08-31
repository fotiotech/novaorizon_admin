// app/promotion-types/create/page.tsx

import { PromotionTypeForm } from "@/app/(marketing)/components/PromotionTypeForm";
import {
  listPromotionTypeProperties,
  createPromotionType,
} from "@/app/actions/promotionType";

export const dynamic = "force-dynamic";

export default async function CreatePromotionTypePage() {
  let properties: any[] = [];

  try {
    const result = await listPromotionTypeProperties({}, { limit: 100 });
    properties = result?.data ?? [];
  } catch (error) {
    console.error("Failed to load promotion type properties:", error);
  }

  const availableProperties = properties.map((p: any) => ({
    label: `${p.name} (${p.code})`,
    value: p._id.toString(),
  }));

  async function handleCreate(data: any) {
    "use server";
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
