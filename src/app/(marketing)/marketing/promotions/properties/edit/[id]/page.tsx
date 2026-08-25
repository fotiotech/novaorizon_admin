// app/marketing/promotion/properties/edit/[id]/page.tsx

import { PromotionPropertyForm } from '@/app/(marketing)/components/PromotionPropertyForm';
import { getPromotionProperty, updatePromotionProperty } from '@/app/actions/promotion';
import { notFound } from 'next/navigation';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionPropertyPage(props: EditPageProps) {
  const params = await props.params;
  const property:any = await getPromotionProperty(params.id);

  if (!property) {
    notFound();
  }

  // Convert to the form's expected shape
  const initialValues = {
    ...property,
    // Ensure option is an array (it might be undefined)
    option: property?.option || [],
  };

  async function handleUpdate(data: any) {
    'use server';
    await updatePromotionProperty(params.id, data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Promotion Property</h1>
      <PromotionPropertyForm initialValues={initialValues} onSubmit={handleUpdate} />
    </div>
  );
}