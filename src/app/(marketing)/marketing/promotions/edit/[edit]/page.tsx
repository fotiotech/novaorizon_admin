// app/promotions/edit/[id]/page.tsx

import { DynamicPromotionForm } from '@/app/(marketing)/components/PromotionForm';
import { getPromotion, updatePromotion } from '@/app/actions/promotion';
import { listPromotionTypes } from '@/app/actions/promotionType';
import { notFound } from 'next/navigation';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionPage(props: EditPageProps) {
  const params = await props.params;
  const [promotion, { data: types }] = await Promise.all([
    getPromotion(params.id),
    listPromotionTypes({ isActive: true }, { limit: 100 }),
  ]);

  if (!promotion) {
    notFound();
  }

  async function handleUpdate(data: any) {
    'use server';
    await updatePromotion(params.id, data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Promotion</h1>
      <DynamicPromotionForm
        promotionTypes={types as any}
        initialValues={promotion as any}
        onSubmit={handleUpdate}
      />
    </div>
  );
}