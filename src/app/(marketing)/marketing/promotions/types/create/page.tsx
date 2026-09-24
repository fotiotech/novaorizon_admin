// app/marketing/promotions/types/create/page.tsx
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
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PromotionTypeForm
        availableProperties={availableProperties}
        onSubmit={handleCreate}
      />
    </div>
  );
}
