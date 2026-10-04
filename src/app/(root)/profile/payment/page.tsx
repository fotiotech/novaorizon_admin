"use client";

import { useState, useEffect } from "react";
import {
  getUserPaymentMethods,
  deletePaymentMethod,
} from "@/app/actions/payment";
import { getUserAddresses } from "@/app/actions/address";
import PaymentMethodForm from "../_component/PaymentMethodForm";

export default function PaymentMethodsPage() {
  const [showForm, setShowForm] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const [addrs, methods] = await Promise.all([
        getUserAddresses(),
        getUserPaymentMethods(),
      ]);
      setAddresses(addrs as any);
      setPaymentMethods(methods);
    };
    loadData();
  }, []);

  return (
    <div>
      <button onClick={() => setShowForm(true)}>Add Payment Method</button>

      {showForm && (
        <PaymentMethodForm
          addresses={addresses}
          onSuccess={() => {
            setShowForm(false);
            // Refresh list
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {paymentMethods.map((pm: any) => (
        <div key={pm._id}>
          {pm.methodType === "CreditCard" && (
            <span>💳 **** {pm.details.cardNumber.slice(-4)}</span>
          )}
          {pm.methodType === "MobileMoney" && (
            <span>
              📱 {pm.details.provider} {pm.details.phoneNumber}
            </span>
          )}
          {pm.methodType === "PayPal" && <span>PayPal {pm.details.email}</span>}
          <button onClick={() => deletePaymentMethod(pm._id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
