// app/marketing/promotions/properties/create/page.tsx
import { PromotionPropertyForm } from "@/app/(marketing)/components/PromotionPropertyForm";
import { createPromotionProperty } from "@/app/actions/promotion";

export default async function CreatePromotionPropertyPage() {
  async function handleCreate(data: any) {
    "use server";
    await createPromotionProperty(data);
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
      <PromotionPropertyForm onSubmit={handleCreate} />
    </div>
  );
}
