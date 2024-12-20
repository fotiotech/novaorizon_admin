import React, { useState } from "react";
import PayPalButton from "@/components/payments/PaypalButton";

const PaypalPayment = () => {
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const handleSuccess = (details: any) => {
    setPaymentStatus(
      "Payment successful! Transaction completed by " +
        details.payer.name.given_name
    );
  };

  const handleError = (error: any) => {
    setPaymentStatus("Payment failed! " + error);
  };
  return (
    <div className="my-3">
      <PayPalButton
        amount="0.01"
        currency="USD"
        onSuccess={handleSuccess}
        onError={handleError}
      />
      {paymentStatus && <p>{paymentStatus}</p>}
    </div>
  );
};

export default PaypalPayment;
