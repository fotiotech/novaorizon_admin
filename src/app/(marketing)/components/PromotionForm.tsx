// components/DynamicPromotionForm.tsx
'use client';

import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// --- Types ---
interface PropertyDefinition {
  _id: string;
  code: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multi-select' | 'checkbox' | 'radio' | 'boolean' | 'date' | 'url';
  isRequired: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  defaultValue?: any;
}

interface PromotionType {
  _id: string;
  name: string;
  code: string;
  calculationType: string;
  properties: PropertyDefinition[];
}

// Base form values (common fields)
interface BaseFormValues {
  promotionTypeId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority: number;
  customerEligibility: {
    allCustomers: boolean;
    customerGroupIds: string[];
    minOrderAmount: number;
  };
  usageLimits: {
    totalUses: number | null;
    perCustomer: number | null;
    perOrder: number;
  };
  stackable: boolean;
  exclusiveWith: string[];
  propertyValues: Record<string, any>;
}

// Props
interface DynamicPromotionFormProps {
  promotionTypes: PromotionType[];
  initialValues?: Partial<BaseFormValues>;
  onSubmit: (data: any) => Promise<any>;
  customerGroups?: { label: string; value: string }[];
  otherPromotions?: { label: string; value: string }[];
}

// --- Helper to build static base schema ---
const baseSchema = z.object({
  promotionTypeId: z.string().min(1, 'Promotion type is required'),
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  customerEligibility: z.object({
    allCustomers: z.boolean().default(true),
    customerGroupIds: z.array(z.string()).default([]),
    minOrderAmount: z.number().default(0),
  }),
  usageLimits: z.object({
    totalUses: z.number().nullable().default(null),
    perCustomer: z.number().nullable().default(null),
    perOrder: z.number().default(1),
  }),
  stackable: z.boolean().default(false),
  exclusiveWith: z.array(z.string()).default([]),
  propertyValues: z.record(z.any()).default({}),
});

type FormValues = z.infer<typeof baseSchema>;

// --- Component ---
export function DynamicPromotionForm({
  promotionTypes,
  initialValues,
  onSubmit,
  customerGroups = [],
  otherPromotions = [],
}: DynamicPromotionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(initialValues?.promotionTypeId || '');

  const {
    control,
    handleSubmit,
    register,
    setValue,
    getValues,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema) as any,
    defaultValues: {
      promotionTypeId: initialValues?.promotionTypeId || '',
      name: initialValues?.name || '',
      description: initialValues?.description || '',
      startDate: initialValues?.startDate
        ? new Date(initialValues.startDate).toISOString().slice(0, 16)
        : '',
      endDate: initialValues?.endDate
        ? new Date(initialValues.endDate).toISOString().slice(0, 16)
        : '',
      isActive: initialValues?.isActive ?? true,
      priority: initialValues?.priority || 0,
      customerEligibility: {
        allCustomers: initialValues?.customerEligibility?.allCustomers ?? true,
        customerGroupIds: initialValues?.customerEligibility?.customerGroupIds || [],
        minOrderAmount: initialValues?.customerEligibility?.minOrderAmount || 0,
      },
      usageLimits: {
        totalUses: initialValues?.usageLimits?.totalUses ?? null,
        perCustomer: initialValues?.usageLimits?.perCustomer ?? null,
        perOrder: initialValues?.usageLimits?.perOrder ?? 1,
      },
      stackable: initialValues?.stackable || false,
      exclusiveWith: initialValues?.exclusiveWith || [],
      propertyValues: initialValues?.propertyValues || {},
    },
  });

  const selectedType = promotionTypes.find((t) => t._id === selectedTypeId);
  const allCustomers = watch('customerEligibility.allCustomers');

  // Reset property values when type changes
  useEffect(() => {
    if (selectedTypeId && selectedType) {
      const newPropertyValues: Record<string, any> = {};
      selectedType.properties.forEach((prop) => {
        // Preserve existing values if they match the same type (e.g., when editing)
        const existing = getValues('propertyValues')?.[prop.code];
        newPropertyValues[prop.code] = existing !== undefined ? existing : (prop.defaultValue ?? '');
      });
      setValue('propertyValues', newPropertyValues);
    }
  }, [selectedTypeId, selectedType, setValue, getValues]);

  // Watch property values for validation on change
  const propertyValues = watch('propertyValues');

  // --- Validation helper for property fields ---
  const validateProperty = (prop: PropertyDefinition, value: any): string | true => {
    if (prop.isRequired) {
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return `${prop.name} is required`;
      }
      if (typeof value === 'number' && isNaN(value)) {
        return `${prop.name} is required`;
      }
    }
    if (prop.type === 'number') {
      const num = Number(value);
      if (!isNaN(num)) {
        if (prop.validation?.min !== undefined && num < prop.validation.min) {
          return `Minimum value is ${prop.validation.min}`;
        }
        if (prop.validation?.max !== undefined && num > prop.validation.max) {
          return `Maximum value is ${prop.validation.max}`;
        }
      }
    }
    if (prop.type === 'text' || prop.type === 'url') {
      if (typeof value === 'string') {
        if (prop.validation?.minLength && value.length < prop.validation.minLength) {
          return `Minimum length is ${prop.validation.minLength}`;
        }
        if (prop.validation?.maxLength && value.length > prop.validation.maxLength) {
          return `Maximum length is ${prop.validation.maxLength}`;
        }
        if (prop.validation?.pattern && !new RegExp(prop.validation.pattern).test(value)) {
          return 'Invalid format';
        }
      }
    }
    return true;
  };

  // --- Submit handler ---
  const onFormSubmit = async (data: FormValues) => {
    // Validate dynamic properties
    let hasError = false;
    const propertyErrors: Record<string, string> = {};
    if (selectedType) {
      for (const prop of selectedType.properties) {
        const value = data.propertyValues?.[prop.code];
        const result = validateProperty(prop, value);
        if (result !== true) {
          propertyErrors[prop.code] = result;
          hasError = true;
        }
      }
    }
    if (hasError) {
      // Set errors manually on the propertyValues field
      // We'll store them in a state to display
      // For simplicity, we'll throw an error
      setSubmitError('Please fix the property validation errors.');
      // You could also set errors on the form using setError, but that's complex for nested fields
      // Instead, we'll rely on the inline validation in the render function
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Convert dates to Date objects before submitting
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };
      await onSubmit(payload);
      router.push('/promotions');
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render property field with Controller ---
  const renderPropertyField = (prop: PropertyDefinition) => {
    const fieldName = `propertyValues.${prop.code}` as const;
    const error = (errors.propertyValues as any)?.[prop.code]?.message;

    return (
      <div key={prop._id} className="mb-4">
        <label className="block text-sm font-medium">
          {prop.name} {prop.isRequired && <span className="text-red-500">*</span>}
        </label>
        <Controller
          name={fieldName}
          control={control}
          rules={{
            required: prop.isRequired ? `${prop.name} is required` : false,
            ...(prop.type === 'number' && {
              min: prop.validation?.min,
              max: prop.validation?.max,
              valueAsNumber: true,
            }),
            ...(prop.type === 'text' && {
              minLength: prop.validation?.minLength,
              maxLength: prop.validation?.maxLength,
              pattern: prop.validation?.pattern ? new RegExp(prop.validation.pattern) : undefined,
            }),
          }}
          render={({ field }) => {
            const { onChange, onBlur, value, ref } = field;

            switch (prop.type) {
              case 'text':
              case 'url':
                return (
                  <input
                    ref={ref}
                    type={prop.type === 'url' ? 'url' : 'text'}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                );
              case 'number':
                return (
                  <input
                    ref={ref}
                    type="number"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.valueAsNumber)}
                    onBlur={onBlur}
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                );
              case 'select':
                return (
                  <select
                    ref={ref}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    <option value="">Select...</option>
                    {prop.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                );
              case 'multi-select':
                return (
                  <select
                    ref={ref}
                    multiple
                    value={Array.isArray(value) ? value : []}
                    onChange={(e) => {
                      const options = e.target.options;
                      const selected = Array.from(options)
                        .filter((opt) => opt.selected)
                        .map((opt) => opt.value);
                      onChange(selected);
                    }}
                    onBlur={onBlur}
                    className="mt-1 w-full border rounded px-3 py-2"
                    size={4}
                  >
                    {prop.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                );
              case 'checkbox':
                return (
                  <div className="space-y-2">
                    {prop.options?.map((opt) => (
                      <label key={opt} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={Array.isArray(value) && value.includes(opt)}
                          onChange={(e) => {
                            const current = Array.isArray(value) ? value : [];
                            if (e.target.checked) {
                              onChange([...current, opt]);
                            } else {
                              onChange(current.filter((v: string) => v !== opt));
                            }
                          }}
                          onBlur={onBlur}
                          className="mr-2"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                );
              case 'radio':
                return (
                  <div className="space-y-2">
                    {prop.options?.map((opt) => (
                      <label key={opt} className="flex items-center">
                        <input
                          type="radio"
                          value={opt}
                          checked={value === opt}
                          onChange={() => onChange(opt)}
                          onBlur={onBlur}
                          className="mr-2"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                );
              case 'boolean':
                return (
                  <input
                    ref={ref}
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    onBlur={onBlur}
                    className="mt-1"
                  />
                );
              case 'date':
                return (
                  <input
                    ref={ref}
                    type="datetime-local"
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                );
              default:
                return (
                  <input
                    ref={ref}
                    type="text"
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                );
            }
          }}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        {/* Additional validation messages from the manual check can be shown here */}
        {!error && submitError && (errors.propertyValues as any)?.[prop.code]?.message && (
          <p className="text-red-500 text-sm mt-1">
            {(errors.propertyValues as any)[prop.code].message}
          </p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit as any)} className="space-y-6 max-w-3xl">
      {submitError && <div className="p-3 bg-red-50 text-red-700 rounded">{submitError}</div>}

      {/* Promotion Type */}
      <div>
        <label className="block text-sm font-medium">Promotion Type *</label>
        <select
          {...register('promotionTypeId')}
          onChange={(e) => setSelectedTypeId(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2"
        >
          <option value="">Select a promotion type...</option>
          {promotionTypes.map((type) => (
            <option key={type._id} value={type._id}>
              {type.name} ({type.calculationType})
            </option>
          ))}
        </select>
        {errors.promotionTypeId && (
          <p className="text-red-500 text-sm">{errors.promotionTypeId.message}</p>
        )}
      </div>

      {selectedType && (
        <>
          {/* Type Info */}
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-blue-700">
              <strong>Type:</strong> {selectedType.name}
            </p>
            <p className="text-sm text-blue-700">
              <strong>Calculation:</strong> {selectedType.calculationType.replace('_', ' ')}
            </p>
          </div>

          {/* Dynamic Properties */}
          {selectedType.properties.length > 0 && (
            <fieldset className="border p-4 rounded">
              <legend className="text-sm font-medium">Properties</legend>
              <div className="space-y-4">
                {selectedType.properties.map((prop) => renderPropertyField(prop))}
              </div>
            </fieldset>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Name *</label>
              <input {...register('name')} className="mt-1 w-full border rounded px-3 py-2" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Priority</label>
              <input
                type="number"
                {...register('priority', { valueAsNumber: true })}
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="mt-1 w-full border rounded px-3 py-2"
            />
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

          <div className="flex items-center">
            <input type="checkbox" {...register('isActive')} className="mr-2" />
            <label className="text-sm font-medium">Active</label>
          </div>

          {/* Customer Eligibility */}
          <fieldset className="border p-4 rounded">
            <legend className="text-sm font-medium">Customer Eligibility</legend>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('customerEligibility.allCustomers')}
                  className="mr-2"
                />
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
                    {customerGroups.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
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
                <label className="block text-sm">Total Uses</label>
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
              <label className="block text-sm">Exclusive With</label>
              <select
                multiple
                {...register('exclusiveWith')}
                className="mt-1 w-full border rounded px-3 py-2"
                size={3}
              >
                {otherPromotions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

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