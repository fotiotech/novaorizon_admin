// components/PromotionPropertyForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PromotionPropertyFormValues, promotionPropertySchema } from '@/app/lib/validation/promotionProperty';

interface PromotionPropertyFormProps {
  initialValues?: Partial<PromotionPropertyFormValues>;
  onSubmit: (data: PromotionPropertyFormValues) => Promise<any>;
}

export function PromotionPropertyForm({ initialValues, onSubmit }: PromotionPropertyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    setValue,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PromotionPropertyFormValues>({
    resolver: zodResolver(promotionPropertySchema) as any,
    defaultValues: {
      code: '',
      name: '',
      isRequired: false,
      sort_order: 0,
      option: [],
      type: 'text',
      ...initialValues,
    },
  });

  const selectedType = watch('type');
  // Show option field for types that support predefined options
  const showOptions = ['select', 'checkbox', 'radio', 'multi-select'].includes(selectedType);

  const onFormSubmit = async (data: PromotionPropertyFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(data);
      router.push('/promotion-properties');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 max-w-md">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium">Code *</label>
        <input
          {...register('code')}
          className="mt-1 w-full border rounded px-3 py-2"
          placeholder="e.g., discount_value"
        />
        {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Name *</label>
        <input
          {...register('name')}
          className="mt-1 w-full border rounded px-3 py-2"
          placeholder="e.g., Discount Value"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Type *</label>
        <select {...register('type')} className="mt-1 w-full border rounded px-3 py-2">
          <option value="text">Text</option>
          <option value="select">Select</option>
          <option value="checkbox">Checkbox</option>
          <option value="radio">Radio</option>
          <option value="boolean">Boolean</option>
          <option value="textarea">Textarea</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="color">Color</option>
          <option value="file">File</option>
          <option value="url">URL</option>
          <option value="multi-select">Multi-Select</option>
        </select>
        {errors.type && <p className="text-red-500 text-sm">{errors.type.message}</p>}
      </div>

      {showOptions && (
        <div>
          <label className="block text-sm font-medium">
            Options (one per line)
          </label>
          <textarea
  {...register('option')}
  className="mt-1 w-full border rounded px-3 py-2"
  rows={4}
  placeholder="Option 1&#10;Option 2&#10;Option 3"
  value={(watch('option') || []).join('\n')}
  onChange={(e) => {
    const lines = e.target.value.split('\n').filter(Boolean);
    setValue('option', lines);
  }}
/>
          {errors.option && <p className="text-red-500 text-sm">{errors.option.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Sort Order</label>
        <input
          type="number"
          {...register('sort_order', { valueAsNumber: true })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
        {errors.sort_order && <p className="text-red-500 text-sm">{errors.sort_order.message}</p>}
      </div>

      <div className="flex items-center">
        <input type="checkbox" {...register('isRequired')} className="mr-2" />
        <label className="text-sm font-medium">Required</label>
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