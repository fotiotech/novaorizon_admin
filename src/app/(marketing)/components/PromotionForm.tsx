// components/PromotionForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PromotionFormValues, promotionSchema } from '@/app/lib/validation/promotion';

interface PromotionFormProps {
  initialValues?: Partial<PromotionFormValues>;
  onSubmit: (data: PromotionFormValues) => Promise<any>;
  options: {
    customerGroups: { label: string; value: string }[];
    promotions: { label: string; value: string }[];
    properties: { label: string; value: string }[];
  };
}

export function PromotionForm({ initialValues, onSubmit, options }: PromotionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      type: 'percentage',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 0,
      customerEligibility: {
        allCustomers: true,
        customerGroupIds: [],
        minOrderAmount: 0,
      },
      usageLimits: {
        totalUses: null,
        perCustomer: null,
        perOrder: 1,
      },
      stackable: false,
      exclusiveWith: [],
      property: [],
      ...initialValues,
    },
  });

  const allCustomers = watch('customerEligibility.allCustomers');

  const onFormSubmit = async (data: PromotionFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(data);
      router.push('/promotions');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit as any)} className="space-y-6 max-w-3xl">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Name *</label>
          <input {...register('name')} className="mt-1 w-full border rounded px-3 py-2" />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Type *</label>
          <select {...register('type')} className="mt-1 w-full border rounded px-3 py-2">
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed Amount</option>
            <option value="buy_x_get_y">Buy X Get Y</option>
            <option value="free_shipping">Free Shipping</option>
            <option value="bundle_discount">Bundle Discount</option>
          </select>
          {errors.type && <p className="text-red-500 text-sm">{errors.type.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea {...register('description')} rows={3} className="mt-1 w-full border rounded px-3 py-2" />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Start Date *</label>
          <input
            type="datetime-local"
            {...register('startDate')}
            className="mt-1 w-full border rounded px-3 py-2"
          />
          {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">End Date *</label>
          <input
            type="datetime-local"
            {...register('endDate')}
            className="mt-1 w-full border rounded px-3 py-2"
          />
          {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate.message}</p>}
        </div>
      </div>

      {/* Status & Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <input type="checkbox" {...register('isActive')} className="mr-2" />
          <label className="text-sm font-medium">Active</label>
        </div>
        <div>
          <label className="block text-sm font-medium">Priority (lower = higher)</label>
          <input type="number" {...register('priority', { valueAsNumber: true })} className="mt-1 w-full border rounded px-3 py-2" />
        </div>
      </div>

      {/* Customer Eligibility */}
      <fieldset className="border p-4 rounded">
        <legend className="text-sm font-medium">Customer Eligibility</legend>
        <div className="space-y-2">
          <div className="flex items-center">
            <input type="checkbox" {...register('customerEligibility.allCustomers')} className="mr-2" />
            <label>All Customers</label>
          </div>
          {!allCustomers && (
            <div>
              <label className="block text-sm">Customer Groups</label>
              <select
                multiple
                {...register('customerEligibility.customerGroupIds')}
                className="mt-1 w-full border rounded px-3 py-2"
                size={3}
              >
                {options.customerGroups.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm">Minimum Order Amount</label>
            <input
              type="number"
              step="0.01"
              {...register('customerEligibility.minOrderAmount', { valueAsNumber: true })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </fieldset>

      {/* Usage Limits */}
      <fieldset className="border p-4 rounded">
        <legend className="text-sm font-medium">Usage Limits</legend>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm">Total Uses (leave blank for unlimited)</label>
            <input
              type="number"
              {...register('usageLimits.totalUses', { valueAsNumber: true })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm">Per Customer</label>
            <input
              type="number"
              {...register('usageLimits.perCustomer', { valueAsNumber: true })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm">Per Order</label>
            <input
              type="number"
              {...register('usageLimits.perOrder', { valueAsNumber: true })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </fieldset>

      {/* Stacking */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <input type="checkbox" {...register('stackable')} className="mr-2" />
          <label className="text-sm font-medium">Stackable</label>
        </div>
        <div>
          <label className="block text-sm">Exclusive With (cannot combine)</label>
          <select
            multiple
            {...register('exclusiveWith')}
            className="mt-1 w-full border rounded px-3 py-2"
            size={3}
          >
            {options.promotions.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Properties */}
      <div>
        <label className="block text-sm font-medium">Properties</label>
        <select
          multiple
          {...register('property')}
          className="mt-1 w-full border rounded px-3 py-2"
          size={3}
        >
          {options.properties.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
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