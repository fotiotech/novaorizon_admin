"use client";

import { useState } from "react";
import { createPaymentMethod } from "@/app/actions/payment"; // adjust path
import { IAddress } from "@/models/Address";

interface PaymentMethodFormProps {
  addresses: IAddress[]; // List of user's addresses for the dropdown (Credit Card only)
  onSuccess?: () => void;
  onCancel?: () => void;
}

type MethodType = "CreditCard" | "MobileMoney" | "PayPal";

export default function PaymentMethodForm({
  addresses,
  onSuccess,
  onCancel,
}: PaymentMethodFormProps) {
  const [methodType, setMethodType] = useState<MethodType>("CreditCard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Build the payload based on selected method type
    let payload: any = { methodType };

    if (methodType === "CreditCard") {
      payload.details = {
        cardNumber: formData.get("cardNumber") as string,
        expiryDate: formData.get("expiryDate") as string,
        cardholderName: formData.get("cardholderName") as string,
        billingAddressId: formData.get("billingAddressId") as string,
      };
    } else if (methodType === "MobileMoney") {
      payload.details = {
        phoneNumber: formData.get("phoneNumber") as string,
        provider: formData.get("provider") as string,
        reference: (formData.get("reference") as string) || undefined,
      };
    } else if (methodType === "PayPal") {
      payload.details = {
        email: formData.get("email") as string,
      };
    }

    try {
      const result = await createPaymentMethod(payload);
      if (result.success) {
        e.currentTarget.reset();
        onSuccess?.();
      } else {
        setError("Failed to add payment method.");
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

      {/* Method Type Selector */}
      <div>
        <label htmlFor="methodType" className="block text-sm font-medium">
          Payment Method Type <span className="text-red-500">*</span>
        </label>
        <select
          id="methodType"
          value={methodType}
          onChange={(e) => setMethodType(e.target.value as MethodType)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="CreditCard">Credit / Debit Card</option>
          <option value="MobileMoney">Mobile Money (Cameroon)</option>
          <option value="PayPal">PayPal</option>
        </select>
      </div>

      {/* Dynamic Fields based on methodType */}
      {methodType === "CreditCard" && (
        <>
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium">
              Card Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              required
              placeholder="4111 1111 1111 1111"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                required
                placeholder="MM/YY"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label
                htmlFor="cardholderName"
                className="block text-sm font-medium"
              >
                Cardholder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cardholderName"
                name="cardholderName"
                required
                placeholder="John Doe"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="billingAddressId"
              className="block text-sm font-medium"
            >
              Billing Address <span className="text-red-500">*</span>
            </label>
            <select
              id="billingAddressId"
              name="billingAddressId"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select an address</option>
              {addresses.map((addr) => (
                <option key={addr._id?.toString()} value={addr._id?.toString()}>
                  {addr.label} – {addr.street}, {addr.city}
                </option>
              ))}
            </select>
            {addresses.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                You need to add a billing address first before adding a credit
                card.
              </p>
            )}
          </div>
        </>
      )}

      {methodType === "MobileMoney" && (
        <>
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              required
              placeholder="699999999"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Cameroon format (e.g., 699999999)
            </p>
          </div>

          <div>
            <label htmlFor="provider" className="block text-sm font-medium">
              Mobile Operator <span className="text-red-500">*</span>
            </label>
            <select
              id="provider"
              name="provider"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select operator</option>
              <option value="MTN">MTN</option>
              <option value="Orange">Orange</option>
              <option value="Camtel">Camtel</option>
            </select>
          </div>

          <div>
            <label htmlFor="reference" className="block text-sm font-medium">
              Reference (optional)
            </label>
            <input
              type="text"
              id="reference"
              name="reference"
              placeholder="Transaction ID"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </>
      )}

      {methodType === "PayPal" && (
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            PayPal Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="user@example.com"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Add Payment Method"}
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
