// app/promotions/edit/[id]/page.tsx
export const dynamic = 'force-dynamic';

import { PromotionForm } from '@/app/(marketing)/components/PromotionForm';
import { getPromotion, getPromotionOptions, updatePromotion } from '@/app/actions/promotion';
import { notFound } from 'next/navigation';

interface EditPageProps {
  params: { id: string };
}

export default async function EditPromotionPage({ params }: EditPageProps) {
  const [promotion, options]:any = await Promise.all([
    getPromotion(params?.id),
    getPromotionOptions(),
  ]);

  if (!promotion) {
    notFound();
  }

  // Convert dates to strings for datetime-local inputs
  const initialValues = {
    ...promotion,
    startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().slice(0, 16) : '',
    endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().slice(0, 16) : '',
  };

  async function handleUpdate(data: any) {
    'use server';
    await updatePromotion(params?.id, data);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Promotion</h1>
      <PromotionForm initialValues={initialValues} options={options} onSubmit={handleUpdate} />
    </div>
  );
}