// app/marketing/promotions/properties/edit/[id]/page.tsx
import { PromotionPropertyForm } from "@/app/(marketing)/components/PromotionPropertyForm";
import {
  getPromotionProperty,
  updatePromotionProperty,
} from "@/app/actions/promotion";
import { notFound } from "next/navigation";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionPropertyPage(props: EditPageProps) {
  const { id } = await props.params;
  const property: any = await getPromotionProperty(id);

  if (!property) {
    notFound();
  }

  const initialValues = {
    ...property,
    // Model stores `options`; the form + schema now use the same name.
    // Fall back to [] for older docs that predate the field.
    options: Array.isArray(property?.options) ? property.options : [],
    sortOrder: typeof property?.sortOrder === "number" ? property.sortOrder : 0,
  };

  async function handleUpdate(data: any) {
    "use server";
    await updatePromotionProperty(id, data);
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
      <PromotionPropertyForm
        initialValues={initialValues}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
