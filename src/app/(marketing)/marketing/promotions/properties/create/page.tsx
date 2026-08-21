// app/marketing/promotion/properties/create/page.tsx

import { PromotionPropertyForm } from "@/app/(marketing)/components/PromotionPropertyForm";
import { createPromotionProperty } from "@/app/actions/promotion";


export default async function CreatePromotionPropertyPage() {
  async function handleCreate(data: any) {
    'use server';
    await createPromotionProperty(data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create Promotion Property</h1>
      <PromotionPropertyForm onSubmit={handleCreate} />
    </div>
  );
}