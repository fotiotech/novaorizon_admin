// app/marketing/promotions/types/edit/[id]/page.tsx
import { PromotionTypeForm } from "@/app/(marketing)/components/PromotionTypeForm";
import {
  getPromotionType,
  listPromotionTypeProperties,
  updatePromotionType,
} from "@/app/actions/promotionType";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionTypePage(props: EditPageProps) {
  const { id } = await props.params;

  let promotionType: any = null;
  let properties: any[] = [];

  try {
    [promotionType, properties] = await Promise.all([
      getPromotionType(id, true),
      listPromotionTypeProperties({}, { limit: 100 }).then(
        (result) => result?.data ?? [],
      ),
    ]);
  } catch (error) {
    console.error("Failed to load promotion type data:", error);
  }

  if (!promotionType) {
    notFound();
  }

  const availableProperties = properties.map((p: any) => ({
    label: `${p.name} (${p.code})`,
    value: p._id.toString(),
  }));

  const initialValues = {
    ...promotionType,
    properties:
      promotionType.properties?.map((p: any) =>
        typeof p === "object" ? p._id.toString() : p.toString(),
      ) ?? [],
  };

  async function handleUpdate(data: any) {
    "use server";
    await updatePromotionType(id, data);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PromotionTypeForm
        initialValues={initialValues}
        availableProperties={availableProperties}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
