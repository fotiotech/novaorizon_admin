// components/PromotionTypeForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const promotionTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  code: z.string().min(1, 'Code is required').trim(),
  description: z.string().optional(),
  calculationType: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping', 'bundle_discount']),
  properties: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  icon: z.string().optional(),
});

type PromotionTypeFormValues = z.infer<typeof promotionTypeSchema>;

interface PromotionTypeFormProps {
  initialValues?: Partial<PromotionTypeFormValues>;
  onSubmit: (data: PromotionTypeFormValues) => Promise<any>;
  availableProperties: { label: string; value: string }[];
}

export function PromotionTypeForm({ initialValues, onSubmit, availableProperties }: PromotionTypeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PromotionTypeFormValues>({
    resolver: zodResolver(promotionTypeSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      description: '',
      calculationType: 'percentage',
      properties: [],
      isActive: true,
      icon: '',
      ...initialValues,
    },
  });

  const onFormSubmit = async (data: PromotionTypeFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(data);
      router.push('/marketing/promotions/types');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 max-w-2xl">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Name *</label>
          <input {...register('name')} className="mt-1 w-full border rounded px-3 py-2" />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Code *</label>
          <input {...register('code')} className="mt-1 w-full border rounded px-3 py-2" />
          {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea {...register('description')} rows={3} className="mt-1 w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium">Calculation Type *</label>
        <select {...register('calculationType')} className="mt-1 w-full border rounded px-3 py-2">
          <option value="percentage">Percentage</option>
          <option value="fixed_amount">Fixed Amount</option>
          <option value="buy_x_get_y">Buy X Get Y</option>
          <option value="free_shipping">Free Shipping</option>
          <option value="bundle_discount">Bundle Discount</option>
        </select>
        {errors.calculationType && <p className="text-red-500 text-sm">{errors.calculationType.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Properties</label>
        <select
          multiple
          {...register('properties')}
          className="mt-1 w-full border rounded px-3 py-2"
          size={4}
        >
          {availableProperties.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
      </div>

      <div>
        <label className="block text-sm font-medium">Icon (optional)</label>
        <input {...register('icon')} className="mt-1 w-full border rounded px-3 py-2" placeholder="e.g., 🎉" />
      </div>

      <div className="flex items-center">
        <input type="checkbox" {...register('isActive')} className="mr-2" />
        <label className="text-sm font-medium">Active</label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border px-4 py-2 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}