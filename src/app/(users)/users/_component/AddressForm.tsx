"use client";

import { useState } from "react";
import { createAddress, updateAddress } from "@/app/actions/address"; // adjust path
import { IAddress } from "@/models/Address";

interface AddressFormProps {
  initialData?: IAddress | null; // if provided, we're in update mode
  onSuccess?: () => void; // callback after successful submission
  onCancel?: () => void;
}

export default function AddressForm({
  initialData = null,
  onSuccess,
  onCancel,
}: AddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if we are in update mode
  const isUpdate = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      let result;
      if (isUpdate && initialData?._id) {
        // Update mode: pass the address ID and form data
        result = await updateAddress(initialData._id.toString(), formData);
      } else {
        // Create mode
        result = await createAddress(formData);
      }

      if (result.success) {
        e.currentTarget.reset();
        onSuccess?.();
      } else {
        setError("Failed to save address. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="label" className="block text-sm font-medium">
          Label <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="label"
          name="label"
          required
          defaultValue={initialData?.label || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Home, Office"
        />
      </div>

      <div>
        <label htmlFor="street" className="block text-sm font-medium">
          Street <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="street"
          name="street"
          required
          defaultValue={initialData?.street || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium">
          City <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="city"
          name="city"
          required
          defaultValue={initialData?.city || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="state" className="block text-sm font-medium">
          State (optional)
        </label>
        <input
          type="text"
          id="state"
          name="state"
          defaultValue={initialData?.state || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="postalCode" className="block text-sm font-medium">
          Postal Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="postalCode"
          name="postalCode"
          required
          defaultValue={initialData?.postalCode || ""}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium">
          Country
        </label>
        <input
          type="text"
          id="country"
          name="country"
          defaultValue={initialData?.country || "Cameroon"}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isDefault"
          name="isDefault"
          defaultChecked={initialData?.isDefault || false}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isDefault" className="ml-2 block text-sm">
          Set as default address
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : isUpdate ? "Update Address" : "Add Address"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
