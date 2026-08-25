// app/promotion-types/edit/[id]/page.tsx

import { PromotionTypeForm } from '@/app/(marketing)/components/PromotionTypeForm';
import { getPromotionType, listPromotionTypeProperties, updatePromotionType } from '@/app/actions/promotionType';
import { notFound } from 'next/navigation';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionTypePage(props: EditPageProps) {
  const params = await props.params;
  const [promotionType, propertiesData]:any = await Promise.all([
    getPromotionType(params.id, true), // populate properties
    listPromotionTypeProperties({}, { limit: 100 }),
  ]);

  if (!promotionType) {
    notFound();
  }

  const availableProperties = propertiesData.data.map((p:any) => ({
    label: `${p.name} (${p.code})`,
    value: p._id.toString(),
  }));

  // Map the selected properties to their IDs
  const initialValues = {
    ...promotionType,
    properties: promotionType.properties?.map((p: any) => p._id.toString()) || [],
  };

  async function handleUpdate(data: any) {
    'use server';
    await updatePromotionType(params.id, data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Promotion Type</h1>
      <PromotionTypeForm
        initialValues={initialValues}
        availableProperties={availableProperties}
        onSubmit={handleUpdate}
      />
    </div>
  );
}